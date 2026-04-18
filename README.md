# QCM FFVL

The official [FFVL](https://ffvl.fr/) multiple-choice application for preparing and taking paragliding and hang gliding French pilot license exams.

| Version | URL                                 |
|---------|-------------------------------------|
| Stable  | https://qcm.ffvl.fr/                |
| Dev     | https://jruffet.github.io/qcmffvl/  |

## Features

### Learning & Exam Modes
- **Training Mode**: Practice with instant feedback and score tracking.
- **Exam Mode**: Simulate official exam conditions with specific question counts and no instant feedback.
- **Printable Exams**: Generate formal exam headers for candidates and examiners.

### Custom Study Tools
- **Tailored Sessions**: Filter questions by aircraft type (Paragliding, Hang gliding), license level, and subject category (e.g., Meteorology, Regulations).
- **Session Sharing**: Generate and share unique questionnaires using a single QCM ID.
- **Flexible Question Counts**: Choose from a set number of questions or study the entire database.

### User Experience
- **Offline Support**: Study anytime, anywhere, even without an internet connection.
- **Mobile Ready**: Fully responsive design with PWA support (install via "Add to home screen").
- **Persistent Progress**: Automatically saves your settings and unfinished sessions.
- **Question Reporting**: Easily report issues or request help with specific questions.

## Local Development (Docker)
### Dev environment
To start the development environment, run the following command from the project root (this essentially wraps `npm install && npm run dev` with no need to "trust me bro"):

```bash
docker compose -f docker/docker-compose.yml up --build
```
The application will be available at `http://localhost:3000`.

### Run commands in environment
`docker exec -u node -it qcmffvl COMMAND`

For example:
- `docker exec -u node -it qcmffvl npm run lint`
- `docker exec -u node -it qcmffvl npm run test`
