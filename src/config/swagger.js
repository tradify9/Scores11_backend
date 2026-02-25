import swaggerUi from 'swagger-ui-express';
import config from './env.js';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Crick11 API Documentation',
      version: '1.0.0',
      description: 'Cricket Scoring and Tournament Management Platform API',
      contact: {
        name: 'API Support',
        email: 'support@crick11.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development Server'
      },
      {
        url: 'https://api.crick11.com',
        description: 'Production Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            statusCode: { type: 'integer' },
            message: { type: 'string' },
            error: { type: 'string' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            statusCode: { type: 'integer' },
            message: { type: 'string' },
            data: { type: 'object' }
          }
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./src/**/*.js', './src/docs/*.yaml']
};

export const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerOptions, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Crick11 API Docs',
    customfavIcon: '/favicon.ico'
  }));
  
  app.get('/api-docs.json', (req, res) => {
    res.json(swaggerOptions.definition);
  });
  
  console.log('Swagger documentation available at /api-docs');
};

export default setupSwagger;
