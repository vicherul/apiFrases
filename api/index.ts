import express , {Request, Response} from "express";
import mongoose from "mongoose";
import dotenv from "dotenv"
import cors from "cors";

// 1.- Activamos las variables de entorno de nuestro archivo secreto
dotenv.config();

// 2.- Creamos la aplicacion express
const app = express();
app.use(express.json()) // permite que nuestra api entienda el json
app.use(cors()) // permite que nuestra api reciba solicitudes de otros dominios

// Conexion a MongoDB

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;

if(!MONGODB_URI) {
    throw new Error ("Falta la variable de entorno MONGODB_URI")
}

const MONGODB_URI_VALIDATED: string = MONGODB_URI;

let isMongoConnected = false;
let currentDatabase = ""; // Valor por defecto, se actualizara al conectar 

const connectToMongo = async () => {
    if(isMongoConnected) return;

    // Si existe DB_NAME, forzamos ese nombre de base en la conexion
    const connectionOptions = DB_NAME ? {dbName: DB_NAME} : undefined;

    await mongoose.connect(MONGODB_URI_VALIDATED, connectionOptions)
    currentDatabase = mongoose.connection.name
} 

// 4.- Creamos el molde (Esquema para nuestras frases)

const FraseSchema = new mongoose.Schema(
    {
        text: String,
        author: String,
        image: String,
        
    },
    {
        collection: "Frasesclase"
    }
);

const Frase = mongoose.models.Frases || mongoose.model("Frase", FraseSchema);

const getMongoDebugInfo = () => {
    return{
        database: currentDatabase || mongoose.connection.name,
        collection: Frase.collection.name,
        readyState: mongoose.connection.readyState,
    }
}
// 5.- Crearemos todas las rutas, get, post, todo esto vamos a configurarlo en vercel.

// Para debug
app.get("/api/debug-db", async(req: Request, res: Response) => {
    try {
        await connectToMongo();
        res.json(getMongoDebugInfo());
    } catch (error) {
        console.error("Error al inspeccionar MongoDB:", error)
        res.status(500).json({
            error: "No se pudo inspeccionar la conexion",
            detail: error instanceof Error ? error.message: "Error Desconocido"
        })
    }
});

// GET DE LAS FRASES
app.get("/api/frases", async(req: Request, res: Response)=>{
    try {
        await connectToMongo();
        const frases = await Frase.find();
        res.json(frases)
    } catch (error) {
        console.error("Error al leer frases", error)
        res.status(500).json({
            error: "No se pudieron obtener las frases",
            detail: error instanceof Error ? error.message: "Error Desconocido"
        })
    }
});

// POST DE LAS FRASES
app.post("/api/frases",async(req: Request, res: Response)=>{
    try {
        if(!req.body || typeof req.body !== "object"){
            return res.status(400).json({error: "Debes enviar un JSON válido"})
        }
        
        const { text, author, image } = req.body
        if(!text || !author || !image){
            return res.status(400).json({error: "Debes enviar texto, autor e imagen!"})
        }

        await connectToMongo();
        const nuevaFrase = new Frase({text, author, image}) //Toma los datos que envia el usuario
        await nuevaFrase.save() // Lo guarda en la base de datos
        res.status(201).json(nuevaFrase) //Responder la frase recien creada
    } catch (error) {
        console.error("Error al crear la frase:", error)
        res.status(500).json({
            error: "No se pudo crear la frase",
            detail: error instanceof Error ? error.message: "Error Desconocido"
        })
    }
}),

// PUT DE LAS FRASES
app.put("/api/frases/:id", async(req: Request, res: Response)=>{
    try {
        const fraseId = req.params.id;
        if(!req.body || typeof req.body !== "object"){
            return res.status(400).json({error: "Debes enviar un JSON válido"})
        }

        const { text, author, image } = req.body;
        await connectToMongo();
        const fraseActualizada = await Frase.findByIdAndUpdate(fraseId, { text, author, image }, { new: true });
        if (!fraseActualizada) {
            return res.status(404).json({ error: "Frase no encontrada" });
        }
        res.json(fraseActualizada);
    } catch (error) {
        console.error("Error al actualizar la frase:", error);
        res.status(500).json({
            error: "No se pudo actualizar la frase",
            detail: error instanceof Error ? error.message : "Error Desconocido"
        });
    }
});

// DELETE DE LAS FRASES
app.delete("/api/frases/:id", async(req: Request, res: Response)=>{
    try {
        const fraseId = req.params.id;
        await connectToMongo();
        const fraseEliminada = await Frase.findByIdAndDelete(fraseId);
        if (!fraseEliminada) {
            return res.status(404).json({ error: "Frase no encontrada" });
        }
        res.json({ message: "Frase eliminada correctamente" });
    } catch (error) {
        console.error("Error al eliminar la frase:", error);
        res.status(500).json({
            error: "No se pudo eliminar la frase",
            detail: error instanceof Error ? error.message : "Error Desconocido"
        });
    }
});

export default app;