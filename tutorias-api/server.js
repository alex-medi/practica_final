require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer  = require('multer');

const { TematicasController,
    UsuariosController,
    PreguntasController,
    RespuestasController
 } = require('./controllers');


const { validarAutorizacion } = require('./middlewares');
const { HTTP_PORT } = process.env;

const upload = multer()
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Endpoints / Rutas

//Tematicas
app.get('/api/tematicas', TematicasController.getTematicas);
app.get('/api/tematicas/:nombre', TematicasController.getTematicasBynombre);

// Usuarios
app.get('/api/usuarios/:id', UsuariosController.getusuariosById);
app.post('/api/usuarios', upload.single('imagen'), UsuariosController.createUsuario);
app.post('/api/usuarios/login', UsuariosController.login);
app.delete('/api/usuarios/:id', UsuariosController.deleteUsuario);
app.put('/api/usuarios/', validarAutorizacion, upload.single('imagen'), UsuariosController.modifyUsuario);

//Preguntas
app.post('/api/preguntas/:tematicaId', validarAutorizacion, upload.single('captura'), PreguntasController.createPregunta);
app.get('/api/preguntas/:tematicaId', PreguntasController.getPreguntasBytematicaId);
app.get('/api/preguntaId/:id', PreguntasController.getPreguntasById);
app.get('/api/pregunta/:key', PreguntasController.getPreguntasByKey);

//Respuestas
app.post('/api/respuestas/:preguntaId', validarAutorizacion, upload.single('captura'), RespuestasController.responderPregunta);
app.get('/api/respuestas/:preguntaId', validarAutorizacion, RespuestasController.getRespuestasBypreguntasId);

//Puntuacion
app.post('/api/puntuacion/:respuestaId', validarAutorizacion, RespuestasController.createScore);

app.use('/static', express.static('images'))
app.use('/static', express.static('capturas'))

// Escuchar un puerto
app.listen(HTTP_PORT, () => console.log(`Escuchando en el puerto ${HTTP_PORT}`));