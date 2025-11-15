const redisService = require('../lib/redis');

const cacheMiddleware = (options = {}) => {
    const {
        prefix = '',
        expire = 3600,
        checkUser = true
    } = options;

    return async (req, res, next) => {
        if (req.method !== 'GET') return next();

        try {
            const userId = checkUser ? req.user?.id : '';
            const cacheKey = `${prefix}:${userId}:${req.originalUrl}`;
            
            const cachedData = await redisService.get(cacheKey);
            if (cachedData) return res.json(cachedData);

            const originalJson = res.json;
            res.json = function(data) {
                redisService.set(cacheKey, data, expire);
                return originalJson.call(this, data);
            };

            next();
        } catch (error) {
            console.error('Cache middleware error:', error);
            next();
        }
    };
};

module.exports = cacheMiddleware;