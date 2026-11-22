package dev.paperworkdecoder.app

import android.graphics.Bitmap
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class Stage { INPUT, REVIEW, RESULT }

const val MAX_LETTER_CHARS = 20_000

data class UiState(
    val stage: Stage = Stage.INPUT,
    val text: String = "",
    val photo: Bitmap? = null,
    val language: String = "English",
    val entities: List<Entity> = emptyList(),
    val usedModel: Boolean = false,
    val readBy: Source? = null,
    val device: DeviceModel = DeviceModel.UNAVAILABLE,
    val busy: String? = null,
    val error: String? = null,
    val needConsent: Boolean = false,
    val explaining: Boolean = false,
    val result: Sourced<Explanation>? = null,
    val simpler: Map<String, Sourced<String>> = emptyMap(),
    val goal: String = "",
    val reply: Sourced<String>? = null,
) {
    val redacted: String get() = Redactor.redact(text, entities)
    fun show(s: String): String = Redactor.rehydrate(s, entities)
}

class DecoderViewModel : ViewModel() {
    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            val status = HybridAi.deviceStatus()
            _state.update { it.copy(device = status) }
        }
    }

    fun setText(value: String) = _state.update { it.copy(text = value, photo = null) }
    fun setPhoto(bitmap: Bitmap?) = _state.update { it.copy(photo = bitmap, needConsent = false) }
    fun setLanguage(value: String) = _state.update { it.copy(language = value) }
    fun setGoal(value: String) = _state.update { it.copy(goal = value) }
    fun useSample() = _state.update { it.copy(text = SAMPLE_LETTER, photo = null) }
    fun dismissError() = _state.update { it.copy(error = null) }
    fun cancelConsent() = _state.update { it.copy(needConsent = false, photo = null) }
    fun back() = _state.update { it.copy(stage = Stage.INPUT) }
    fun reset() = _state.update { UiState(device = it.device, language = it.language) }
    fun remove(entity: Entity) = _state.update { it.copy(entities = it.entities - entity) }

    fun addManual(value: String, type: EntityType): Boolean {
        val trimmed = value.trim()
        val s = _state.value
        if (trimmed.length < 3 || !s.text.contains(trimmed)) {
            _state.update { it.copy(error = "That exact text is not in the letter (at least 3 characters).") }
            return false
        }
        val found = Redactor.withNameParts(listOf(Found(trimmed, type)))
        _state.update { it.copy(entities = Redactor.addEntities(it.entities, found, FoundBy.YOU), error = null) }
        return true
    }

    private fun task(label: String, block: suspend () -> Unit) {
        if (_state.value.busy != null) return
        _state.update { it.copy(busy = label, error = null) }
        viewModelScope.launch {
            try {
                block()
            } catch (e: Exception) {
                _state.update { it.copy(error = explainError(e)) }
            } finally {
                _state.update { it.copy(busy = null, explaining = false) }
            }
        }
    }

    private fun explainError(e: Exception): String {
        val raw = e.message.orEmpty()
        return when {
            raw.startsWith("LIMIT:") -> raw.removePrefix("LIMIT:")
            Regex("""app.?check|\b40[013]\b|permission|unauthenticated""", RegexOption.IGNORE_CASE).containsMatchIn(raw) ->
                if (BuildConfig.DEBUG) "Firebase rejected the request (App Check). Register this device's debug token from Logcat in the Firebase console, then try again."
                else "The security check for this app did not pass. Try again in a moment."
            Regex("""\b429\b|quota|rate.?limit|resource.?exhausted""", RegexOption.IGNORE_CASE).containsMatchIn(raw) ->
                "The free usage limit was reached. Wait a minute and try again."
            Regex("""\b503\b|overloaded|unavailable|BUSY""", RegexOption.IGNORE_CASE).containsMatchIn(raw) ->
                "The model is busy right now. Try again in a few seconds."
            Regex("""unable to resolve host|network|timeout|connect""", RegexOption.IGNORE_CASE).containsMatchIn(raw) ->
                "No connection. Hiding details works offline, but explaining the letter needs the internet."
            raw.contains("JSON") -> "The answer came back in a form the app could not read. Try again."
            else -> "That did not work: $raw"
        }
    }

    private suspend fun hide(body: String, readBy: Source?) {
        var found = Redactor.addEntities(emptyList(), Redactor.findByPattern(body), FoundBy.PATTERN)
        var usedModel = false
        if (_state.value.device != DeviceModel.UNAVAILABLE) {
            _state.update { it.copy(busy = "Finding personal details on this device…") }
            try {
                if (HybridAi.prepareDeviceModel { }) {
                    found = Redactor.addEntities(found, Redactor.withNameParts(HybridAi.findPersonalData(body)), FoundBy.MODEL)
                    usedModel = true
                }
            } catch (_: Exception) {
                // Fall through: pattern-only redaction, and the review screen says so.
            }
        }
        _state.update {
            it.copy(text = body, entities = found, usedModel = usedModel, readBy = readBy, stage = Stage.REVIEW, device = if (usedModel) DeviceModel.AVAILABLE else it.device)
        }
    }

    fun start() = task("Reading…") {
        val s = _state.value
        val photo = s.photo
        if (photo == null) {
            if (s.text.length > MAX_LETTER_CHARS) throw IllegalArgumentException("LIMIT:That is too long. Paste one letter at a time, up to 20,000 characters.")
            hide(s.text, null)
        } else if (s.device == DeviceModel.UNAVAILABLE) {
            _state.update { it.copy(needConsent = true) }
        } else {
            HybridAi.prepareDeviceModel { }
            val read = HybridAi.readImage(photo)
            hide(read.value, read.source)
        }
    }

    fun readInCloud() = task("Reading the photo in the cloud…") {
        val photo = _state.value.photo ?: return@task
        _state.update { it.copy(needConsent = false) }
        val read = HybridAi.readImage(photo, allowCloud = true)
        hide(read.value, read.source)
    }

    fun explain() = task("Explaining the redacted letter in the cloud…") {
        _state.update { it.copy(explaining = true) }
        val s = _state.value
        val result = HybridAi.explainLetter(s.redacted, s.language)
        _state.update { it.copy(result = result, simpler = emptyMap(), reply = null, stage = Stage.RESULT) }
    }

    fun makeSimpler(term: Term) = task("Rewording…") {
        val simple = HybridAi.simplify(term.term, term.meaning, _state.value.language)
        _state.update { it.copy(simpler = it.simpler + (term.term to simple)) }
    }

    fun writeReply() = task("Drafting a reply in the cloud…") {
        val s = _state.value
        // The goal is typed by the user and may repeat a hidden detail, so it is redacted too.
        val reply = HybridAi.draftReply(s.redacted, Redactor.redact(s.goal, s.entities), s.language)
        _state.update { it.copy(reply = reply) }
    }
}
