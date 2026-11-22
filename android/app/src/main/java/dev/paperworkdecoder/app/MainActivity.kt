package dev.paperworkdecoder.app

import android.content.ClipData
import android.content.ClipboardManager
import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts.PickVisualMedia
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel

private val LANGUAGES = listOf("English", "Greek", "Spanish", "Arabic", "Ukrainian", "Polish", "Turkish", "Hindi", "French", "German")
private val PLACEHOLDER = Regex("""\[[A-Z]+_\d+]""")

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { PaperworkTheme { DecoderScreen() } }
    }
}

@Composable
fun DecoderScreen(vm: DecoderViewModel = viewModel()) {
    val s by vm.state.collectAsStateWithLifecycle()
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = { StatusBar(s, vm::dismissError) },
    ) { padding ->
        Column(
            Modifier.fillMaxSize().padding(padding).imePadding().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("Paperwork Decoder", fontFamily = FontFamily.Serif, fontWeight = FontWeight.SemiBold, fontSize = 26.sp, modifier = Modifier.semantics { heading() })
            Steps(s.stage)
            when (s.stage) {
                Stage.INPUT -> InputCard(s, vm)
                Stage.REVIEW -> if (s.explaining) SkeletonCard() else ReviewCard(s, vm)
                Stage.RESULT -> ResultCards(s, vm)
            }
            Text(
                "Not legal advice. Built with Firebase AI Logic hybrid inference: Gemini Nano on-device, Gemini in the cloud.",
                color = LocalTones.current.muted, fontSize = 12.sp,
            )
        }
    }
}

@Composable
private fun Steps(stage: Stage) {
    val tones = LocalTones.current
    val labels = listOf("Add your letter", "Check what is hidden", "Understand it")
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
        labels.forEachIndexed { i, label ->
            val current = i == stage.ordinal
            val done = i < stage.ordinal
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Box(
                    Modifier.size(24.dp).clip(CircleShape).background(
                        when {
                            current -> MaterialTheme.colorScheme.onBackground
                            done -> tones.deviceBg
                            else -> tones.line
                        },
                    ),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        if (done) "✓" else "${i + 1}", fontSize = 12.sp,
                        color = when {
                            current -> MaterialTheme.colorScheme.background
                            done -> tones.device
                            else -> tones.muted
                        },
                    )
                }
                if (current) Text(label, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            }
        }
    }
}

@Composable
private fun Card(content: @Composable () -> Unit) {
    Surface(
        shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, LocalTones.current.line), modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { content() }
    }
}

@Composable
private fun Heading(text: String) =
    Text(text, fontFamily = FontFamily.Serif, fontWeight = FontWeight.SemiBold, fontSize = 20.sp, modifier = Modifier.semantics { heading() })

@Composable
private fun SubHeading(text: String) =
    Text(text, fontFamily = FontFamily.Serif, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, modifier = Modifier.padding(top = 6.dp).semantics { heading() })

@Composable
private fun Pill(text: String, bg: Color, fg: Color) =
    Text(text, color = fg, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.clip(RoundedCornerShape(50)).background(bg).padding(horizontal = 10.dp, vertical = 3.dp))

@Composable
private fun SourceBadge(source: Source?, noAi: Boolean = false) {
    val t = LocalTones.current
    when {
        noAi -> Pill("On this device · no AI", t.deviceBg, t.device)
        source == Source.CLOUD -> Pill("Cloud", t.cloudBg, t.cloud)
        else -> Pill("On this device", t.deviceBg, t.device)
    }
}

@Composable
private fun Notice(content: @Composable () -> Unit) {
    val t = LocalTones.current
    Surface(color = t.warnBg, contentColor = t.warnInk, shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { content() }
    }
}

@Composable
private fun redactedText(text: String): AnnotatedString {
    val chip = SpanStyle(background = MaterialTheme.colorScheme.onBackground, color = MaterialTheme.colorScheme.background, fontWeight = FontWeight.Bold, fontSize = 12.sp)
    return buildAnnotatedString {
        var last = 0
        for (m in PLACEHOLDER.findAll(text)) {
            append(text.substring(last, m.range.first))
            withStyle(chip) { append(" ${m.value.trim('[', ']')} ") }
            last = m.range.last + 1
        }
        append(text.substring(last))
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun InputCard(s: UiState, vm: DecoderViewModel) {
    val context = LocalContext.current
    val t = LocalTones.current
    val picker = rememberLauncherForActivityResult(PickVisualMedia()) { uri ->
        if (uri != null) {
            // Decode in memory, scaled down: the on-device model takes a single Bitmap.
            val bitmap = runCatching {
                ImageDecoder.decodeBitmap(ImageDecoder.createSource(context.contentResolver, uri)) { decoder, info, _ ->
                    decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
                    val longest = maxOf(info.size.width, info.size.height)
                    if (longest > 1600) decoder.setTargetSampleSize((longest / 1600).coerceAtLeast(1))
                }.copy(Bitmap.Config.ARGB_8888, false)
            }.getOrNull()
            vm.setPhoto(bitmap)
        }
    }
    Card {
        Heading("Paste the letter or add a photo")
        when (s.device) {
            DeviceModel.AVAILABLE -> Pill("On-device model ready", t.deviceBg, t.device)
            DeviceModel.UNAVAILABLE -> Pill("No on-device model on this phone", t.line, t.muted)
            else -> Pill("On-device model will download", t.deviceBg, t.device)
        }
        OutlinedTextField(
            value = s.text, onValueChange = vm::setText,
            placeholder = { Text("Paste the full text of the letter here…") },
            modifier = Modifier.fillMaxWidth().heightIn(min = 180.dp, max = 320.dp),
        )
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { picker.launch(PickVisualMediaRequest(PickVisualMedia.ImageOnly)) }) {
                Text(if (s.photo != null) "Photo added" else "Add a photo")
            }
            OutlinedButton(onClick = vm::useSample) { Text("Try a sample letter") }
            LanguageMenu(s.language, vm::setLanguage)
        }
        if (s.needConsent) Notice {
            Text("This phone cannot read photos on-device, so the photo would have to be sent to the cloud before anything is hidden. You can type or paste the text instead to keep it private.")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = vm::readInCloud, enabled = s.busy == null) { Text("Send the photo") }
                TextButton(onClick = vm::cancelConsent) { Text("Cancel") }
            }
        }
        Button(
            onClick = vm::start, enabled = s.busy == null && (s.photo != null || s.text.trim().length >= 20),
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) { Text("Hide my personal details", fontSize = 16.sp) }
        Text("Nothing leaves this device at this step.", color = t.muted, fontSize = 13.sp)
    }
}

@Composable
private fun LanguageMenu(language: String, onPick: (String) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(onClick = { open = true }) { Text("Explain in $language") }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            LANGUAGES.forEach { l -> DropdownMenuItem(text = { Text(l) }, onClick = { onPick(l); open = false }) }
        }
    }
}

@Composable
private fun ReviewCard(s: UiState, vm: DecoderViewModel) {
    val t = LocalTones.current
    var newValue by remember { mutableStateOf("") }
    var newType by remember { mutableStateOf(EntityType.NAME) }
    var typeOpen by remember { mutableStateOf(false) }
    Card {
        Heading("This is all the cloud will see")
        SourceBadge(Source.DEVICE, noAi = !s.usedModel)
        if (s.readBy == Source.CLOUD) Notice { Text("The photo was read in the cloud because you allowed it.") }
        if (!s.usedModel) Notice {
            Text("No on-device model ran here, so only patterns (emails, phone numbers, long numbers, bank accounts) were hidden.")
            Text("Add names and addresses yourself below before continuing.", fontWeight = FontWeight.SemiBold)
        }
        Surface(color = MaterialTheme.colorScheme.background, shape = RoundedCornerShape(8.dp), border = BorderStroke(1.dp, t.line)) {
            Text(redactedText(s.redacted), fontFamily = FontFamily.Monospace, fontSize = 13.sp, lineHeight = 20.sp, modifier = Modifier.padding(12.dp))
        }
        SubHeading("Hidden on this device (${s.entities.size})")
        if (s.entities.isEmpty()) Text("Nothing hidden yet.", color = t.muted, fontSize = 13.sp)
        s.entities.forEach { e ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(redactedText(e.placeholder), fontFamily = FontFamily.Monospace)
                Spacer(Modifier.width(8.dp))
                Text(e.value, fontSize = 14.sp, modifier = Modifier.weight(1f))
                TextButton(onClick = { vm.remove(e) }) { Text("Show") }
            }
        }
        OutlinedTextField(
            value = newValue, onValueChange = { newValue = it }, singleLine = true,
            placeholder = { Text("Hide something else…") }, modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { if (vm.addManual(newValue, newType)) newValue = "" }),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box {
                OutlinedButton(onClick = { typeOpen = true }) { Text(newType.name) }
                DropdownMenu(expanded = typeOpen, onDismissRequest = { typeOpen = false }) {
                    EntityType.entries.forEach { ty -> DropdownMenuItem(text = { Text(ty.name) }, onClick = { newType = ty; typeOpen = false }) }
                }
            }
            OutlinedButton(onClick = { if (vm.addManual(newValue, newType)) newValue = "" }) { Text("Hide") }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = vm::back, enabled = s.busy == null, modifier = Modifier.height(52.dp)) { Text("Back") }
            Button(onClick = vm::explain, enabled = s.busy == null, modifier = Modifier.weight(1f).height(52.dp)) { Text("Explain this letter", fontSize = 16.sp) }
        }
        Text(
            "Only the text above is sent. The ${s.entities.size} hidden details stay here and are put back into the answer on this device.",
            color = t.muted, fontSize = 13.sp,
        )
    }
}

@Composable
private fun SkeletonCard() {
    val line = LocalTones.current.line
    Card {
        listOf(0.45f, 1f, 0.85f, 0.3f).forEach { w ->
            Box(Modifier.fillMaxWidth(w).height(18.dp).clip(RoundedCornerShape(6.dp)).background(line))
        }
        Box(Modifier.fillMaxWidth().height(96.dp).clip(RoundedCornerShape(6.dp)).background(line))
    }
}

@Composable
private fun ResultCards(s: UiState, vm: DecoderViewModel) {
    val t = LocalTones.current
    val context = LocalContext.current
    val result = s.result ?: return
    val r = result.value
    Card {
        Heading("What this letter means")
        SourceBadge(result.source)
        Text(s.show(r.summary), fontSize = 17.sp, lineHeight = 25.sp)
        val (bg, fg) = when (r.urgency) {
            "high" -> t.errorBg to t.errorInk
            "low" -> t.deviceBg to t.device
            else -> t.warnBg to t.warnInk
        }
        Pill("Urgency: ${r.urgency.replaceFirstChar(Char::uppercase)}", bg, fg)
        SubHeading("What you need to do")
        if (r.actions.isEmpty()) Text("Nothing. This letter is for your information.")
        r.actions.forEachIndexed { i, a ->
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("${i + 1}. ${s.show(a.what)}")
                if (a.deadline.isNotBlank()) Pill("Deadline: ${s.show(a.deadline)}", t.warnBg, t.warnInk)
            }
        }
        SubHeading("If you do nothing")
        Text(s.show(r.consequences))
        if (r.questions.isNotEmpty()) {
            SubHeading("Worth asking")
            r.questions.forEach { Text("• ${s.show(it)}") }
        }
        HorizontalDivider(color = t.line)
        Text("Sent to the cloud: ${"%,d".format(s.redacted.length)} characters of redacted text. Kept on this device: ${s.entities.size} personal details.", color = t.muted, fontSize = 13.sp)
    }
    if (r.terms.isNotEmpty()) Card {
        Heading("Difficult words")
        r.terms.forEach { term ->
            val simple = s.simpler[term.term]
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(s.show(term.term), fontWeight = FontWeight.SemiBold)
                Text(s.show(simple?.value ?: term.meaning))
                if (simple != null) SourceBadge(simple.source)
                else TextButton(onClick = { vm.makeSimpler(term) }, enabled = s.busy == null) { Text("Say it more simply") }
            }
        }
    }
    Card {
        Heading("Write back")
        OutlinedTextField(
            value = s.goal, onValueChange = vm::setGoal, singleLine = true, modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("e.g. ask for two more weeks to pay") },
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
            keyboardActions = KeyboardActions(onSend = { if (s.goal.trim().length >= 5) vm.writeReply() }),
        )
        Button(onClick = vm::writeReply, enabled = s.busy == null && s.goal.trim().length >= 5) { Text("Draft a reply") }
        s.reply?.let { reply ->
            SourceBadge(reply.source)
            Surface(color = MaterialTheme.colorScheme.background, shape = RoundedCornerShape(8.dp), border = BorderStroke(1.dp, t.line)) {
                Text(s.show(reply.value), modifier = Modifier.padding(12.dp))
            }
            Text("The cloud wrote this with placeholders. Your real details were filled in on this device.", color = t.muted, fontSize = 13.sp)
            var copied by remember(reply) { mutableStateOf(false) }
            OutlinedButton(onClick = {
                context.getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("Reply", s.show(reply.value)))
                copied = true
            }) { Text(if (copied) "Copied" else "Copy reply") }
        }
    }
    OutlinedButton(onClick = vm::reset, enabled = s.busy == null) { Text("Start over with another letter") }
}

@Composable
private fun StatusBar(s: UiState, onDismiss: () -> Unit) {
    val t = LocalTones.current
    val busy = s.busy
    val error = s.error
    if (busy == null && error == null) return
    Surface(
        color = if (busy != null) MaterialTheme.colorScheme.inverseSurface else t.errorBg,
        contentColor = if (busy != null) MaterialTheme.colorScheme.inverseOnSurface else t.errorInk,
        shape = RoundedCornerShape(12.dp), shadowElevation = 6.dp,
        modifier = Modifier.padding(16.dp).fillMaxWidth().semantics { liveRegion = LiveRegionMode.Polite },
    ) {
        Row(Modifier.padding(horizontal = 14.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            if (busy != null) {
                CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.inverseOnSurface)
                Text(busy, fontSize = 14.sp)
            } else {
                Text(error.orEmpty(), fontSize = 14.sp, modifier = Modifier.weight(1f))
                TextButton(onClick = onDismiss) { Text("Dismiss", color = t.errorInk) }
            }
        }
    }
}
