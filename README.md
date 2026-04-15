# QCM FFVL
The official [FFVL](https://ffvl.fr/) multiple-choice application for preparing and taking paragliding and hang gliding pilot license exams.

## Features

### Learning & Exam Modes
- **Training Mode**: Practice with instant feedback and score tracking.
- **Exam Mode**: Simulate official exam conditions with specific question counts and no instant feedback.
- **Printable Exams**: Generate formal exam headers for candidates and examiners.

### Custom Study Tools
- **Tailored Sessions**: Filter questions by aircraft type (Parapente, Delta), license level, and subject category (e.g., Meteorology, Regulations).
- **Session Sharing**: Generate and share unique questionnaires using a single QCM ID.
- **Flexible Question Counts**: Choose from a set number of questions or study the entire database.

### User Experience
- **Offline Support**: Study anytime, anywhere, even without an internet connection.
- **Mobile Ready**: Fully responsive design with PWA support (install via "Add to home screen").
- **Persistent Progress**: Automatically saves your settings and unfinished sessions.
- **Question Reporting**: Easily report issues or request help with specific questions.

## Usage
- Latest stable version: https://qcm.ffvl.fr/
- Dev version: https://jruffet.github.io/qcmffvl/

## Local Development
### Running with Docker Compose
To start the development environment, run the following command from the project root (this essentially wraps `npm install && npm run dev` with no need to "trust me bro"):

```bash
docker compose -f docker/docker-compose.yml up --build
```

The application will be available at `http://localhost:3000`.
