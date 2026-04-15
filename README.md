# QCM FFVL
Official multiple-choice web application for the French paragliding and hang gliding federation ([FFVL](https://ffvl.fr/)) exam to obtain pilot licenses.

## Features
- Training mode
- Exam mode
- Supports multiple aircraft types (Parapente, Delta)
- Various difficulty levels (Brevet Initial, Brevet de Pilote, etc.)
- Category filtering
- Mobile-friendly responsive design
- Offline support

## Usage
- Live demo: https://jruffet.github.io/qcmffvl/
- Latest stable version: https://qcm.ffvl.fr/
- Install on mobile devices by using "Add to home screen" (Brave/Firefox/etc.)

## Local Development
### Running with Docker Compose
To start the development environment, run the following command from the project root:

```bash
docker compose -f docker/docker-compose.yml up --build
```

The application will be available at `http://localhost:3000`.
