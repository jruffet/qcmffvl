import { PRNG } from './core/prng.js';
import { QCM } from './core/qcm.js';

// Attach core to window for AngularJS compatibility
window.PRNG = PRNG;
window.QCM = QCM;

// Import application logic
import './app.js';
import './controllers.js';
import './directives.js';
