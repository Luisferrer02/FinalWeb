---
## 1. Autenticación y autorización robustas  
- **JWT con expiración y refresh sencillo**  
  ```js
  const token = jwt.sign({ _id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "1d" });
  ```  
  ➔ Emisión y verificación de token en un solo lugar (`utils/handleJwt.js`), permitiendo distinguir expirado vs inválido y proteger rutas con `authMiddleware`.  
- **Control de roles**  
  ```js
  const checkRol = roles => (req,res,next) => {
    if (!roles.includes(req.user.role)) return handleHttpError(res,"NOT_ALLOWED",403);
    next();
  }
  ```  
  ➔ Decorador ligero (`middleware/rol.js`) para segregar endpoints de administrador, usuario o invitado.

## 2. Validaciones consistentes en capa de entrada  
- **express-validator + `validateResults`**  
  Cada endpoint expone un array de validadores (`validators/*.js`) que:
  - Aseguran tipos, formatos y obligatoriedad.
  - Centralizan respuestas 422 con lista de errores detallados.
  - Evitan lógica de validación dentro del controlador.

> ```js
> const validatorCreateClient = [
>   check("name").exists().notEmpty(),
>   check("address.postal").isNumeric(),
>   (req,res,next)=> validateResults(req,res,next)
> ];
> ```

## 3. Arquitectura modular y extensible  
- **Rutas auto-cargables**  
  En `routes/index.js` se leen todos los ficheros y se montan bajo `/api`, lo que:
  - Facilita añadir nuevos módulos (`/auth`, `/clients`, `/deliverynotes`…) sin tocar configuración global.  
- **Separación clara**  
  - `controllers/…` → lógica de negocio  
  - `models/nosql/…` → esquemas Mongoose  
  - `utils/…` → auxiliares (JWT, email, IPFS, errores)

## 4. Gestión de datos y estados  
- **Soft-delete y archivado**  
  Clientes y proyectos soportan `archived: Boolean`, lo que permite:
  - Mantener histórico sin eliminar registros físicamente.  
  - Diferenciar listado “activo” y “archivado” con dos endpoints (`GET /`, `GET /archive`).  
- **Timestamps automáticos**  
  Todos los esquemas Mongoose incluyen `timestamps: true`, simplificando auditoría.

## 5. Integración de almacenamiento descentralizado (IPFS)  
- **Subida a Pinata**  
  ```js
  const pinataRes = await uploadToPinata(buffer, filename);
  const ipfsUrl = `https://${process.env.PINATA_GATEWAY_URL}/ipfs/${pinataRes.IpfsHash}`;
  ```  
  ➔ Cualquier archivo (logo de cliente, firma, PDF generado) se publica en IPFS, obteniendo URL inmutable y distribuida.

## 6. Generación dinámica de PDFs  
- **pdfkit** para albaranes  
  - `buildPdfTemplate(doc, note)` crea la cabecera, datos de usuario/cliente/proyecto y listado de ítems.  
  - Streaming directo a la respuesta HTTP con control de errores en flujo.  
- **Post-procesado**: después de firmar, el PDF se sube también a Pinata y se guarda la `pdfUrl` en la base de datos.

## 7. Envío de correos con OAuth2  
- **Gmail + OAuth2** (`utils/handleMails.js`)  
  - Renovación automática de `accessToken`.  
  - Uso de plantillas sencillas para verificación de email, recuperación de contraseña e invitaciones.

## 8. Observabilidad y resiliencia  
- **Logging a Slack**  
  ```js
  const loggerStream = { write: msg => webhook.send({ text: msg.trim() }) };
  morganBody(app, { stream: loggerStream, skip: r=>r.statusCode<400 });
  ```  
  ➔ Captura errores 4xx/5xx en producción y los envía en tiempo real.  
- **Helmet + CORS configurado**  
  Seguridad de cabeceras HTTP y orígenes restringidos por variable de entorno.

## 9. Documentación automática  
- **Swagger** en `/api-docs`  
  – Permite explorar y probar cada endpoint sin salir del navegador.

## 10. Seguridad adicional y rate limiting  
- **Rate limiting**  
  ```js
  const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, message: { error: "TOO_MANY_LOGIN_ATTEMPTS" } });
  router.post("/login", loginLimiter, ...);
  ```  
  ➔ Protege endpoints sensibles (`/auth/login`, `/user/validate-email`, `/user/recover-password-code`) contra ataques de fuerza bruta.  
- **Hashing de códigos**  
  - Código de verificación de email y recuperación de contraseña se guardan con bcrypt (6 salt rounds) en `emailVerificationCodeHash` y `passwordRecoveryCodeHash`.  
  - Cada hash se asocia a un timestamp (`SentAt`) para verificar caducidad antes de aceptar.  

## 11. Flujo de invitación y recuperación de contraseña  
- **Invitaciones seguras**  
  ```js
  const inviteToken = uuidv4();
  invitedUser.inviteTokenHash = await encrypt(inviteToken, 6);
  invitedUser.inviteSentAt = Date.now();
  sendEmail({
    subject: "Invitación para unirse a la plataforma",
    text: `Completa tu registro aquí: ${process.env.FRONTEND_URL}/accept-invite?token=${inviteToken}`
  });
  ```  
  ➔ Token de un solo uso, hashed en BD, expiración (48 h) y validado en `acceptInviteCtrl`.  
- **Aceptación y activación**  
  - Verificación de token y hash, chequeo de caducidad, solicitud de datos mínimos (nombre, contraseña).  
  - Marca `status: "active"`, borra hash y fecha.  
- **Recuperación de contraseña**  
  ```js
  const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
  user.passwordRecoveryCodeHash = await encrypt(rawCode, 6);
  user.passwordRecoveryCodeSentAt = Date.now();
  sendEmail({ subject: "Código de recuperación", text: `Tu código: ${rawCode}` });
  ```  
  ➔ Misma lógica de hash + timestamp + validación en `changePasswordCtrl`, con limpieza tras cambio exitoso.

---

Con esta base tienes un backend pensado para crecer sin fricciones, integrar nuevas entidades, auditar acciones y operar con altos estándares de seguridad, disponibilidad y trazabilidad.

