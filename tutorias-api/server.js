require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

const { TematicasController,
    UsuariosController,
    PreguntasController,
    RespuestasController
 } = require('./controllers');


const { validarAutorizacion } = require('./middlewares');
const { HTTP_PORT } = process.env;

const app = express();

app.use(bodyParser.json());

// Endpoints / Rutas

//Tematicas
app.get('/api/tematicas', TematicasController.getTematicas);
app.get('/api/tematicas/:nombre', TematicasController.getTematicasBynombre);

// Usuarios
app.get('/api/usuarios/:id', UsuariosController.getusuariosById);
app.post('/api/usuarios', UsuariosController.createUsuario);
app.post('/api/usuarios/login', UsuariosController.login);
app.delete('/api/usuarios/:id', UsuariosController.deleteUsuario);
app.put('/api/usuarios/:id', UsuariosController.modifyUsuario);

//Preguntas
app.post('/api/preguntas/:tematicaId', validarAutorizacion, PreguntasController.createPregunta);
app.get('/api/preguntas/:tematicaId', validarAutorizacion, PreguntasController.getPreguntasBytematicaId);

//Respuestas
app.post('/api/respuestas/:preguntaId', validarAutorizacion, RespuestasController.responderPregunta);

// Escuchar un puerto
app.listen(HTTP_PORT, () => console.log(`Escuchando en el puerto ${HTTP_PORT}`));