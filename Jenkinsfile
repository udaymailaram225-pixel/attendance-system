
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
                sh 'echo "Checking Jenkins environment"'
                sh 'java -version'
                sh 'git --version'
                sh 'node --version'
                sh 'npm --version'
                sh 'ls -la'
            }
        }
    }
}
