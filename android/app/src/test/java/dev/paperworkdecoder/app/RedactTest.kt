package dev.paperworkdecoder.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RedactTest {
    private val entities = Redactor.addEntities(emptyList(), Redactor.findByPattern(SAMPLE_LETTER), FoundBy.PATTERN)
    private val values = entities.map { it.value }

    @Test
    fun findsEmailAccountPhoneReferenceAndTaxpayerNumber() {
        for (v in listOf(
            "d.okafor.case@revenue-office.example",
            "GR16 0110 1250 0000 0001 2300 695",
            "+30 210 555 0142",
            "TX-2026-884213",
            "5520934417",
        )) assertTrue("missing $v", v in values)
    }

    @Test
    fun leavesDatesAndAmountsAlone() {
        val out = Redactor.redact(SAMPLE_LETTER, entities)
        assertTrue(out.contains("14 December 2026"))
        assertTrue(out.contains("412.60 EUR"))
        assertTrue(Redactor.findByPattern("Pay by 30.11.2026 or 2026-11-30.").isEmpty())
    }

    @Test
    fun removesEveryHiddenValueAndRestoresExactly() {
        val out = Redactor.redact(SAMPLE_LETTER, entities)
        for (v in values) assertFalse(out.contains(v))
        assertEquals(SAMPLE_LETTER, Redactor.rehydrate(out, entities))
    }

    @Test
    fun hidesASurnameThatAppearsOnItsOwn() {
        val list = Redactor.addEntities(
            entities,
            Redactor.withNameParts(listOf(Found("Mr. Daniel Okafor", EntityType.NAME))),
            FoundBy.MODEL,
        )
        val out = Redactor.redact(SAMPLE_LETTER, list)
        assertFalse(out.contains("Okafor"))
        assertFalse(out.contains("Daniel"))
        assertFalse("Mr" in list.map { it.value })
        assertEquals(SAMPLE_LETTER, Redactor.rehydrate(out, list))
    }

    @Test
    fun matchesWholeWordsOnly() {
        val list = Redactor.addEntities(
            emptyList(),
            listOf(Found("Daniel", EntityType.NAME), Found("123456", EntityType.ID)),
            FoundBy.YOU,
        )
        assertEquals(
            "[NAME_1] met Danielson. Ref [ID_1], not 91234567.",
            Redactor.redact("Daniel met Danielson. Ref 123456, not 91234567.", list),
        )
    }

    @Test
    fun chunksWithoutLosingText() {
        val long = (0 until 400).joinToString("\n") { "Line $it of the letter." }
        val parts = Redactor.chunk(long, 1000)
        assertTrue(parts.size > 1)
        assertEquals(long, parts.joinToString(""))
        assertTrue(parts.all { it.length <= 1000 })
    }
}
