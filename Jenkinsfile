
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
                sh 'echo "Checking Jenkins Linux environment"'
                sh 'java -version'
                sh 'git --version'
                sh 'pwd'
                sh 'ls -la'
            }
        }
    }
}
