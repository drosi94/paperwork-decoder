package dev.paperworkdecoder.app

/** Local-only redaction. Nothing in this file talks to a network. */

enum class EntityType { NAME, ADDRESS, ID, ACCOUNT, PHONE, EMAIL, BIRTHDATE, OTHER }

enum class FoundBy { PATTERN, MODEL, YOU }

data class Found(val value: String, val type: EntityType)

data class Entity(val value: String, val type: EntityType, val placeholder: String, val foundBy: FoundBy)

object Redactor {
    private val dateLike = Regex("""^\d{1,4}[./-]\d{1,2}[./-]\d{1,4}$""")
    private val email = Regex("""[\w.+-]+@[\w-]+(?:\.[\w-]+)+""")
    private val account = Regex("""\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?\b""")
    private val prefixedId = Regex("""\b[A-Z]{1,4}[-/ ]?\d[\d/-]{4,}\d\b""")
    private val phone = Regex("""\+?\d[\d ().-]{7,}\d""")
    private val longNumber = Regex("""\b\d{6,}\b""")
    private val titles = setOf("mrs", "miss", "mister", "madam", "prof", "professor", "doctor", "sir", "the", "and", "von", "van", "del")

    /** Things a regular expression can find reliably, with no model at all. */
    fun findByPattern(text: String): List<Found> {
        val out = mutableListOf<Found>()
        fun add(re: Regex, type: EntityType, ok: (String) -> Boolean = { true }) {
            re.findAll(text).map { it.value.trim() }.filter(ok).forEach { out += Found(it, type) }
        }
        add(email, EntityType.EMAIL)
        add(account, EntityType.ACCOUNT)
        add(prefixedId, EntityType.ID)
        add(phone, EntityType.PHONE) { v ->
            !dateLike.matches(v) && v.count(Char::isDigit) >= 9 && v.any { it in " ().+-" }
        }
        add(longNumber, EntityType.ID)
        return out
    }

    /**
     * A letter that names "Daniel Okafor" usually also says "Mr. Okafor". Hiding only the
     * full name would leak the surname, so each part of a multi-word name is hidden too.
     */
    fun withNameParts(found: List<Found>): List<Found> {
        val parts = found.filter { it.type == EntityType.NAME }
            .flatMap { it.value.split(Regex("""\s+""")) }
            .map { w -> w.trim { !it.isLetter() } }
            .filter { it.length >= 3 && it.first().isUpperCase() && it.lowercase() !in titles }
        return found + parts.map { Found(it, EntityType.NAME) }
    }

    /** Merge new finds into the entity list, numbering placeholders per type. */
    fun addEntities(existing: List<Entity>, found: List<Found>, foundBy: FoundBy): List<Entity> {
        val out = existing.toMutableList()
        for (f in found) {
            val value = f.value.trim()
            if (value.length < 3) continue
            // Skip exact repeats, and anything already covered by a longer hidden value
            // (name parts are the exception: they must be hidden where they stand alone).
            if (out.any { it.value == value || (it.value.contains(value) && f.type != EntityType.NAME) }) continue
            val n = out.count { it.type == f.type } + 1
            out += Entity(value, f.type, "[${f.type.name}_$n]", foundBy)
        }
        return out
    }

    /** Replace every hidden value with its placeholder. Longest first; whole words only. */
    fun redact(text: String, entities: List<Entity>): String {
        var out = text
        for (e in entities.sortedByDescending { it.value.length }) {
            val start = if (e.value.first().isLetterOrDigit()) """(?<![\p{L}\p{N}])""" else ""
            val end = if (e.value.last().isLetterOrDigit()) """(?![\p{L}\p{N}])""" else ""
            out = Regex(start + Regex.escape(e.value) + end).replace(out) { e.placeholder }
        }
        return out
    }

    /** Put the real values back, on this device, into whatever the cloud returned. */
    fun rehydrate(text: String, entities: List<Entity>): String =
        entities.fold(text) { acc, e -> acc.replace(e.placeholder, e.value) }

    /** Split long text so each piece fits the on-device model's 4,000-token request limit. */
    fun chunk(text: String, size: Int = 3000): List<String> {
        val parts = mutableListOf<String>()
        var rest = text
        while (rest.length > size) {
            var cut = rest.lastIndexOf('\n', size)
            if (cut < size / 2) cut = size
            parts += rest.substring(0, cut)
            rest = rest.substring(cut)
        }
        if (rest.isNotBlank()) parts += rest
        return parts
    }
}
