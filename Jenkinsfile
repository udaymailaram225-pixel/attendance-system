
pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Verify Environment') {
            steps {
                sh 'node --version'
                sh 'npm --version'
                sh 'docker --version'
                sh 'docker ps'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Verify Application Files') {
            steps {
                sh 'test -f server.js'
                sh 'test -f db.js'
                sh 'test -f package.json'
                sh 'test -f Dockerfile'
                sh 'echo "Required files verified."'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t attendance-app:jenkins .'
            }
        }
    }
}
