
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
                sh 'git --version'
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
                sh 'test -f public/index.html'
                sh 'echo "Required application files are present."'
            }
        }
    }
}
