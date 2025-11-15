import { getUserTransactions } from "../../services/usuarios/transactionService.js";
import { logSecurityEvent } from '../../utils/securityLogger.js';

export const getTransactions = async (req, res) => {
    try {
        const userId = req.params.userId;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "ID de usuario no proporcionado"
            });
        }

        const transactions = await getUserTransactions(userId);
        
        return res.status(200).json({
            success: true,
            data: transactions
        });
    } catch (error) {
        logSecurityEvent('TRANSACTION_ACCESS_ERROR', 'Error accediendo a información de transacciones', {
            targetUserId: req.params.userId,
            requesterId: req.user?.id_user,
            error: error.message,
            ip: req.ip
        }, 'medium');
        
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};