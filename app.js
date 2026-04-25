require('dotenv').config();

const express = require('express');
const path    = require('path');
const morgan  = require('morgan');
const cors    = require('cors');
const cookieParser = require('cookie-parser');

const connectDB     = require('./config/db');
const errorHandler  = require('./middleware/errorHandler');

// page routes
const indexRouter = require('./routes/index');

// API routes
const authRouter      = require('./routes/auth');
const dashboardRouter = require('./routes/dashboard');
const productsRouter  = require('./routes/products');
const inventoryRouter = require('./routes/inventory');
const machinesRouter  = require('./routes/machines');
const forecastRouter  = require('./routes/forecast');
const ordersRouter    = require('./routes/orders');
const scheduleRouter  = require('./routes/schedule');

connectDB();

const app  = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

// request logging — 'dev' in local, 'combined' in prod for full apache-style logs
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || `http://localhost:${PORT}`,
  credentials: true,
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// API
app.use('/api/auth',      authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/products',  productsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/machines',  machinesRouter);
app.use('/api/forecast',  forecastRouter);
app.use('/api/orders',    ordersRouter);
app.use('/api/schedule',  scheduleRouter);

// page rendering
app.use('/', indexRouter);

// catches anything that slips through with next(err)
app.use(errorHandler);

// auto-bump port if something's already running there
function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`\n🚀  Factory Brain  →  http://localhost:${port}`);
    console.log(`    Env     : ${process.env.NODE_ENV || 'development'}`);
    console.log(`    MongoDB : ${process.env.MONGODB_URI ? 'configured' : '⚠  not set'}\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      server.close();
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

startServer(PORT);

module.exports = app;
