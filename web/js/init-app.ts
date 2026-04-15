import { PRNG } from './core/prng';
import { QCM } from './core/qcm';

import '../css/bootstrap.min.css';
import '../css/qcmffvl.css';

// Attach core to window for AngularJS compatibility
(window as any).PRNG = PRNG;
(window as any).QCM = QCM;

// Import application logic
import './app.js';
import './controllers.js';
import './directives.js';
