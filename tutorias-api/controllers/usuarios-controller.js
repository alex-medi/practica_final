const Joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');


const { database } = require('../infraestructure');

//Funcion que obtiene todos los usuarios
async function getusuariosById(req, res) {
  try {
    // validamos que el nombre es correcto
    const { id } = req.params;
    const schema = Joi.number();
    await schema.validateAsync(id);
         
    const [rows] = await database.pool.query('SELECT * FROM usuarios WHERE id = ?', id);

    if (!rows || !rows.length) {
      // devolvemos 404 Not Found si no encontramos el user en base de datos.
      res.status(404);

      return res.send({ error: 'usuario no encontrado' });
    }
    
    return res.send(rows[0]);

  } catch (err) {
    // enviamos el error al cliente
    res.status(400);
    res.send({ error: err.message });
  }
}

//Función para crear un usuario
async function createUsuario(req, res) {
                
    try {
                        
      const { nombre, email, login, password, repeatedPassword, empresa } = req.body;
      const experto = req.body.experto === "1"

      let imagen = req.file
  
      const userSchema = Joi.object({
        nombre: Joi.string().required(),
        email: Joi.string().email().required(),
        login: Joi.string().required(),
        password: Joi.string().min(8).max(20).required(),
        repeatedPassword: Joi.string().min(6).max(20).required(),
        experto: Joi.boolean().required(),
        empresa: Joi.string()
      });
      //validar la entrada (body)
      await userSchema.validateAsync({ nombre, email, login, password, repeatedPassword, experto });
      
      //validar contraseña
      if (password !== repeatedPassword) {
        const err = new Error('La contraseña debe ser igual en ambos campos');
        err.code = 400;
        throw err;
      }
        
          
      const [emails] = await database.pool.query('SELECT * FROM usuarios WHERE email = ?', email);
      //comprobar si existe el email que viene en el body
      if (emails.length) {
        const err = new Error('Ya existe un usuario con ese email');
        //si existe, devolvemos 409
        err.code = 409;
        throw err;
      }
      //comprobar si existe el login del usuario
      const [logins] = await database.pool.query('SELECT * FROM usuarios WHERE login = ?', login);

      if (logins.length) {
        const err = new Error('Ya existe un usuario con este login');
        err.code = 409;
        throw err;
      }
      
              
      const passwordHash = await bcrypt.hash(password, 10);
      //insertar el usuario en bbdd (con la password encriptada)
      const [usuario] = await database.pool.query('INSERT INTO usuarios (nombre, email, login, password, experto, empresa) VALUES (?, ?, ?, ?, ?, ?)', [nombre, email, login, passwordHash, experto, empresa]);      
  
      const createdId = usuario.insertId;
      if(req.file){
        fs.writeFileSync(path.join('images', 'usuario-' + createdId + '.jpg'), imagen.buffer);
        imagen = 'http://localhost:8080/static/usuario-' + createdId + '.jpg';
        await database.pool.query('UPDATE usuarios SET imagen = ? WHERE id = ?', [imagen,createdId]);
      }

      
      //devolver usuario creado
      const [selectRows] = await database.pool.query('SELECT * FROM usuarios WHERE id = ?', createdId);
      
      const tokenPayload = { id: selectRows[0].id };
      //Recuerda que aqui estas enviando la imagen despues de crear el usuario (prueba a ir cambiando, esta linea de lugar)
      
              
      const token = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET,
        { expiresIn: '30d' },
      );

      res.send({token,...selectRows[0]});
  
    } catch (err) {
      res.status(err.code || 500);
      res.send({error:  err.message} );
    }
  }

  async function login(req, res) {
    try {
      const { login, password }= req.body;
  
      const schema = Joi.object({
        login: Joi.string().required(),
        password: Joi.string().min(8).max(20).required(),
      });
  
      await schema.validateAsync({ login, password  });
  
      // 1. Recuperamos el usuario desde la base de datos.
            
      const [rows] = await database.pool.query('SELECT * FROM usuarios WHERE login = ? OR email = ?', [login, login]);
      
  
      if (!rows || !rows.length) {
        const error = new Error('El email o login es incorrecto');
        error.code = 404;
        throw error;
      }
             
      const user = rows[0];
  
      // 2. Comprobamos que el password que nos están enviando es válido.
  
      const isValidPassword = await bcrypt.compare(password, user.password);
  
      if (!isValidPassword) {
        const error = new Error('La contraseña es incorrecta');
        error.code = 401;
        throw error;
      }
  
      // 3. Construimos el JWT para enviárselo al cliente.
      const tokenPayload = { id: user.id };
         
     
      const token = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET,
        { expiresIn: '30d' },
      );
      
      res.send({
        token,
        login: user.login,
        id: user.id,
        empresa: user.empresa, 
        experto: user.experto,
        nombre: user.nombre,
        email: user.email,
        imagen: user.imagen
      });
  
    } catch (err) {
      res.status(err.code || 500);
      res.send({ error: err.message });
    }
  }

  //borrar usuario
  async function deleteUsuario(req, res) {
    try {
      const { id } = req.params;
      const [usuarios] = await database.pool.query('SELECT * FROM usuarios WHERE id = ?', id);
      //comprobar que el usuario existe
      if (!usuarios.length) {
        res.status(404);
        return res.send({ error: 'Usuario no encontrado' });
      }
          
       
      await database.pool.query('DELETE FROM usuarios WHERE id = ?', id);
  
      res.status(204);
      res.send();
    } catch (err) {
      res.status(500);
      res.send({ error: err.message });
    }
  }

  async function modifyUsuario(req, res) {
    try {
      // validamos los datos de entrada.
      
      const { id } = req.auth;
      let imagen = req.file
      let schema = Joi.number().positive().required();
      await schema.validateAsync(id);
      
      const { experto } = req.body;
      const password = req.body.password ? req.body.password : null
      const login = req.body.login ? req.body.login : null
      const empresa = req.body.empresa ? req.body.empresa : null
                
      schema = Joi.object({
        login: Joi.string().allow(null),
        password: Joi.string().min(8).max(20).allow(null),
        experto: Joi.number(),
        empresa: Joi.string().allow(null)
      });
  
      await schema.validateAsync({ login, password, experto, empresa });
  
      //se busca el usuario a modificar
      
      const [usuario] = await database.pool.query('SELECT * FROM usuarios WHERE id = ?',id);
  
      if (!usuario || !usuario.length) {
        res.status(404);
        return res.send({ error: 'Usuario no encontrado' });
      }
      
      if(req.file){
      fs.writeFileSync(path.join('images', 'usuario-' + req.auth.id + '.jpg'), imagen.buffer)
       imagen = 'http://localhost:8080/static/usuario-' + req.auth.id + '.jpg?' + Date.now()
      } else {
        imagen = usuario[0].imagen
      }
      
      let passwordHash = usuario[0].password
      if (password) {
        passwordHash = await bcrypt.hash(password, 10);
      }

      let newLogin = usuario[0].login
      if (login){
        newLogin = req.body.login
      }

      let newEmpresa = usuario[0].empresa
      if (empresa) {
        newEmpresa = req.body.empresa
      }
                              
            
      // modificar el usuario en la base de datos
      
      await database.pool.query('UPDATE usuarios SET login = ?, password = ?, experto = ?, empresa = ?, imagen = ? WHERE id = ?', [newLogin, passwordHash, experto, newEmpresa, imagen, id]);
  
      // devolvemos el usuario modificado.
      
      const [selectRows] = await database.pool.query('SELECT * FROM usuarios WHERE id = ?', id);
      const tokenPayload = { id: selectRows[0].id };
              
      const token = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET,
        { expiresIn: '30d' },
      );

  
      res.send({token,...selectRows[0]});
    } catch (err) {
      console.log(err)
      res.status(400);
      res.send({ error: err.message });
    }
  }
     

  module.exports = {
    getusuariosById,
    createUsuario,
    login,
    deleteUsuario,
    modifyUsuario
  };