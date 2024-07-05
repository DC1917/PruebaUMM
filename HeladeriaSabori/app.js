const express = require('express');
const path = require('path');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const app = express();
const port = 3000;
const { body, validationResult } = require('express-validator');
const { error } = require('console');

const connection = mysql.createConnection({
    host: '10.0.6.39',
    user: 'estudiante',
    password: 'Info-2023',
    database: 'HeladeriaND_Sabori'
});

// Validación 
const validarNoVacio = (value) => {
    if (!value.trim()) {
        throw new Error('Este campo es requerido');
    }
    return true;
};

//Verificacion de errores para validar si la conexion es correcta
connection.connect((err) => {
    if (err) {
        console.error('Error de conexión a la base de datos: ' + err.stack);
        return;
    }
    console.log('Conexión exitosa a la base de datos.');
});
//Envio los datos del formulario por url
app.use(express.urlencoded({ extended: true }));
//Convierto en formato json
app.use(express.json());
//Configuro para que la aplicacon inicie desde el director o carpeta pagina principal
app.use(express.static(path.join(__dirname, 'pagina_principal')));
//Recibo los valores y los envio a la tabla
app.post('/guardar_helado',(req, res) => {
    const { nombre, descripcion, sabor, tipo, cobertura, precio } = req.body;
    const sql = 'INSERT INTO Helado (nombre, descripcion, sabor, tipo, cobertura, precio) VALUES (?, ?, ?, ?, ?, ?)';
    connection.query(sql, [nombre, descripcion, sabor, tipo, cobertura, precio], (err, result) => {
        if (err) throw err;
        console.log('Helado insertada correctamente.');
        res.redirect('/listardatos.html');
    });
});
//Ruta para mostrar las películas en el listardatos.html con metodo GET
app.get('/helados', (req, res) => {
    //Realiza una consulta SQL para seleccionar todas las filas de la tabla "peliculas"
    connection.query('SELECT * FROM Helado', (err, rows) => {
        //Maneja los errores, si los hay
        if (err) throw err;
        res.send(rows); //Aquí puedes enviar la respuesta como quieras (por ejemplo, renderizar un HTML o enviar un JSON)
    });
});
// Ruta para obtener los datos de un helado por su ID
app.get('/helado_especifico/:id', (req, res) => {
    // Extraer el ID de los parámetros de la solicitud
    const id = req.params.id;
    // Ejecutar una consulta SQL para obtener los datos del helado ID proporcionado
    connection.query('SELECT * FROM Helado WHERE id = ?', [id], (err, result) => {
        if (err) {
            // Manejar el error si ocurre durante la consulta
            console.error('Error al obtener los datos de la película:', err);
            res.status(500).send('Error interno del servidor');
            return;
        }
        // Verificar si no se encontró ninguna película con el ID proporcionado
        if (result.length === 0) {
            res.status(404).send('Película no encontrada');
            return;
        }
        // Enviar los datos de la película como respuesta en formato JSON
        res.json(result[0]);
    });
});


// Ruta para obtener los detalles de un usuario
app.get('/helados/:id', (req, res) => {
    const { id } = req.params;

    const query = 'SELECT Id, nombre, descripcion, sabor, tipo, cobertura, precio FROM Helados WHERE id = ?';
    connection.query(query, [id], (err, result) => {
        if (err) {
            console.error('Error al obtener los detalles del Helado:', err);
            res.status(500).send('Error al obtener los detalles del Helado');
        } else {
            res.json(result[0]);
        }
    });
});

// Ruta para eliminar un usuario
app.delete('/eliminar_helado/:id', (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM Helados WHERE id = ?';
    connection.query(query, [userId], (err, result) => {
        if (err) {
            console.error('Error al eliminar el usuario:', err);
            res.status(500).send('Error al eliminar el usuario');
        } else {
            res.status(200).send('Usuario eliminado exitosamente');
        }
    });
});



// Método para registrar un usuario
app.post('/registrar_usuario', [
    body('nombreCompleto').custom(validarNoVacio).withMessage('Nombre completo es requerido'),
    body('correo').isEmail().withMessage('Correo no es válido'),
    body('nombreUsuario').custom(validarNoVacio).withMessage('Nombre de usuario es requerido'),
    body('claveWeb').custom(validarNoVacio).withMessage('Clave web es requerida'),
    body('rolId').isNumeric().withMessage('ID de rol es requerido y debe ser numérico')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { nombreCompleto, correo, nombreUsuario, claveWeb, rolId } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(claveWeb, 10);
        const sql = 'INSERT INTO Usuarios (nombreCompleto, correo, nombreUsuario, claveWeb, rolId) VALUES (?, ?, ?, ?, ?)';
        connection.query(sql, [nombreCompleto, correo, nombreUsuario, hashedPassword, rolId], (err, result) => {
            if (err) {
                console.error('Error al registrar el usuario:', err);
                return res.status(500).send('Error interno del servidor');
            }
            console.log('Usuario registrado correctamente.');
            res.redirect('login.html'); 
        });
    } catch (err) {
        console.error('Error al registrar el usuario:', err);
        res.status(500).send('Error al registrar el usuario');
    }
});

// Ruta para iniciar sesión
app.post('/iniciar_sesion', async (req, res) => {
    const { correo, claveWeb } = req.body;

    try {
        const sql = 'SELECT u.*, r.NombreRol FROM Usuarios u JOIN Roles r ON u.rolId = r.rolId WHERE u.Correo = ?';
        connection.query(sql, [correo], async (err, result) => {
            if (err) {
                console.error('Error al buscar usuario:', err);
                return res.status(500).send('Error interno del servidor');
            }

            if (result.length === 0) {
                return res.status(404).send('Credenciales incorrectas');
            }

            const usuario = result[0];
            const claveValida = await bcrypt.compare(claveWeb, usuario.ClaveWeb); // Aquí ajustamos el nombre de la columna
            if (!claveValida) {
                return res.status(401).send('Credenciales incorrectas');
            }

            // Redireccionar según el rol
            if (usuario.rolId === 2) { // Asegúrate de que rolId sea numérico para la comparación
                res.redirect('formulario.html');
            } else {
                res.redirect('loginUsuario.html');
            }
        });
            
    } catch (err) {
        console.error('Error al iniciar sesión:', err);
        res.status(500).send('Error al iniciar sesión');
    }
});






//Servidor ejecutandose en el puerto 3000
app.listen(port, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});

