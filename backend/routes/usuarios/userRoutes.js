import express from "express";
import { 
    createUser, 
    getAllUsers, 
    updateUser, 
    deleteUser, 
    checkUserAuthType, 
    verifyPassword,
    checkUserRegistrationStatus,
    verifyUserEmail,
    resendVerificationEmail
} from "../../controllers/usuarios/userController.js";
import { 
    loginUser, 
    logoutUser, 
    googleLogin, 
    refreshToken, 
    revokeAllSessions, 
    checkSessionStatus,
    getPendingLoginAttempts,
    respondToLoginAttempt,
    verifyLoginCode,
    resendVerificationCode,
    longPollLoginAttempts,
    checkLoginStatus 
} from "../../controllers/usuarios/authController.js";
import { 
  requestPasswordReset, 
  resetPassword, 
  verifyResetToken 
} from "../../controllers/usuarios/passwordRecoveryController.js";
import { 
  authenticateUser, 
  getAuthenticatedUser, 
  checkAuthStatus, 
  hasRole 
} from "../../middlewares/authMiddleware.js";
import { 
  deleteUserController
} from "../../controllers/usuarios/deleteUserController.js";
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Rutas existentes de autenticación
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get('/google-login', googleLogin);

// Ruta para refrescar token
router.post("/refresh-token", refreshToken);

// Revoke todas las sesiones iniciadas
router.post("/revoke-sessions/:userId?", authenticateUser, revokeAllSessions);

// Api Publica
router.get('/auth-status', checkAuthStatus);

// Ruta para verificar autenticación
router.get('/authenticate', authenticateUser, getAuthenticatedUser, (req, res) => { 
    res.json({ 
        message: 'Acceso concedido', 
        user: { 
            id_user: req.user.id_user, 
            correo: req.user.correo 
        } 
    }); 
});

// Ruta para verificar contraseña
router.post("/verifyPassword", verifyPassword);

// Ruta para verificar estado de sesión
router.get('/check-session', authenticateUser, checkSessionStatus);

router.get('/login-attempts/:userId/longpoll', authenticateUser, longPollLoginAttempts);

// NUEVAS RUTAS PARA SISTEMA DE VERIFICACIÓN DE MÚLTIPLES SESIONES
router.get('/login-attempts/:userId', authenticateUser, getPendingLoginAttempts);
router.post('/login-attempts/response', authenticateUser, respondToLoginAttempt);
router.post('/login-attempts/verify', verifyLoginCode);
router.post('/login-attempts/resend-code', resendVerificationCode);

// Rutas para usuarios
router.post("/usuarios", createUser);
router.get("/usuarios", getAllUsers);
router.put("/usuarios/:id", updateUser);
router.delete("/usuarios/:id", deleteUser);
router.get("/authtype/:id", authenticateUser, checkUserAuthType);

// Rutas para recuperación de contraseña
router.post("/request-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.get("/verify-reset-token", verifyResetToken);

// API PUBLICA 
router.post("/login-status", checkLoginStatus);
router.post("/registration-status", checkUserRegistrationStatus);

// Rutas para verificación de correo
router.get("/verify-email", verifyUserEmail);
router.post("/resend-verification", resendVerificationEmail);

// NUEVAS RUTAS PARA ELIMINACIÓN DE CUENTA
// Ruta para obtener la página de eliminación de cuenta
router.get('/eliminar-cuenta', authenticateUser, (req, res) => {
  const nonce = crypto.randomBytes(16).toString('hex');
  
  const csrfToken = crypto.randomBytes(64).toString('hex');
  res.cookie('csrf-token', csrfToken, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict'
  });

  res.sendFile(path.join(__dirname, '../../../frontend/views/cuenta', 'delete-account.html'));
});

// Ruta para solicitar el código de verificación para eliminar cuenta
router.post('/cuenta/solicitar-eliminacion', authenticateUser, deleteUserController.requestDeletion);

// Ruta para verificar el código y eliminar la cuenta
router.post('/cuenta/confirmar-eliminacion', authenticateUser, deleteUserController.confirmDeletion);

// Ruta para la limpieza manual de usuarios no verificados
router.get("/admin/cleanup-unverified", authenticateUser, hasRole(3), async (req, res) => {
    try {
        const { cleanupService } = await import('../../services/usuarios/cleanupService.js');
        const deletedUsers = await cleanupService.runManualCleanup();
        
        res.status(200).json({ 
            message: `Eliminados ${deletedUsers.length} usuarios no verificados`, 
            deletedUsers 
        });
    } catch (error) {
        console.error("Error en limpieza manual:", error);
        res.status(500).json({ error: "Error en limpieza de usuarios no verificados" });
    }
});

export default router;