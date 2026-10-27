
pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Verify Project Files') {
            steps {
                bat 'node --version'
                bat 'npm --version'
                bat 'dir'
            }
        }
    }
}
