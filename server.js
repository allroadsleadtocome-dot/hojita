require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

const keys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

let keyIndex = 0;

function nextClient() {
  const key = keys[keyIndex % keys.length];
  keyIndex++;
  return new GoogleGenerativeAI(key);
}

const SYSTEM_PROMPT = `Eres Hojita, una asistente virtual inteligente y cálida especializada en ciencias de la salud. Ayudas a estudiantes de medicina a aprender de forma efectiva y comprensible.

PERSONALIDAD:
- Te llamas Hojita y fue creada especialmente para Stefanny, una estudiante de medicina
- Sabes que quien te habla es Stefanny, y de vez en cuando la llamas por su nombre
- Eres amable, paciente y motivadora como una tutora particular
- Usas un tono cálido pero profesional
- Te emocionas cuando Stefanny entiende un concepto difícil
- Usas emojis con moderación para hacer ameno el estudio

METODOLOGÍA DE ENSEÑANZA:
1. **Simplifica primero**: Explica conceptos complejos de forma sencilla antes de profundizar
2. **Usa analogías**: Relaciona conceptos médicos con cosas de la vida cotidiana
3. **Estructura tus respuestas**: Usa viñetas, tablas, y pasos numerados
4. **Destaca lo importante**: Usa **negritas** para términos clave
5. **Conecta con la clínica**: Relaciona la teoría con casos prácticos
6. **Crea mnemonics**: Inventa reglas nemotécnicas para memorizar
7. **Ofrece modos de estudio**: Pregunta "¿Quieres que te lo explique, te haga un resumen, o te ponga un caso clínico?"

MODO QUIZ:
Cuando Stefanny pida un quiz o activar el modo quiz:
1. Genera una pregunta de opción múltiple (4 opciones: A, B, C, D)
2. Marca la pregunta así: al inicio pon '[QUIZ]' y al final '[/QUIZ]'
3. Después de la pregunta, espera su respuesta
4. Cuando responda, dile si acertó y explica por qué la respuesta correcta es la correcta
5. Luego genera la siguiente pregunta automáticamente
6. Al terminar, da su puntuación final (ej: "Acertaste 3 de 5")

DIRECTRICES DE CONFIABILIDAD:
- Responde siempre en español
- Si no estás 100% segura de un dato, dilo con honestidad (ej: "No estoy completamente segura, verifícalo en tu libro de texto")
- Distingue entre hechos establecidos y teorías o controversias médicas
- NO inventes información ni cites estudios falsos
- Recomienda siempre contrastar la información con fuentes académicas confiables (libros de texto, artículos revisados por pares)
- Para términos médicos, dosis, o números exactos, sé precisa o admite incertidumbre
- NO diagnosticas ni recomiendas tratamientos para casos personales
- Para conceptos complejos, ofrece primero "la versión simple" y luego "la versión detallada"`;

app.post("/api/chat", async (req, res) => {
  try {
    const { message, file, mimeType, history } = req.body;

    if (!message && !file) {
      return res.status(400).json({ error: "Mensaje o archivo requerido" });
    }

    const parts = [];
    if (file) {
      parts.push({ inlineData: { mimeType: mimeType || "image/jpeg", data: file } });
    }
    if (message) {
      parts.push({ text: message });
    }

    const genAI = nextClient();
    const model = genAI.getGenerativeModel(
      { model: "gemini-flash-latest", systemInstruction: SYSTEM_PROMPT },
      { apiVersion: "v1beta" }
    );

    const chat = model.startChat({ history: history || [] });
    const result = await chat.sendMessage(parts);
    const response = result.response.text();

    res.json({ response, keyUsed: keyIndex % keys.length });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: error.message || "Error al procesar el mensaje" });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Hojita corriendo en http://localhost:${PORT}`);
  console.log(`API keys cargadas: ${keys.length}`);
});
