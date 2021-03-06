module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: ["build", "dist/*"],
    copy: {
      dist: {
        expand: true,
        cwd: 'src',
        src: ["**/*"],
        dest: 'build'
      }
    },
    concat: {
      js: {
        src: ['haven_artifacts/main/jquery/**/*.js', 'haven_artifacts/main/angularjs/**/*.js', 'haven_artifacts/main/bootstrap/**/*.js', 'haven_artifacts/main/socket.io-client/dist/socket.io.js', 'haven_artifacts/main/easyrtc/api/easyrtc.js', 'haven_artifacts/main/async/lib/async.js', 'haven_artifacts/main/chat-ng-client/**/*.js', 'haven_artifacts/main/chat-client/**/*.js'],
        dest: 'build/static/libraries.js'
      },
      css: {
        src: ['haven_artifacts/main/**/*.css'],
        dest: 'build/static/libraries.css'
      }
    },
    compress: {
      dist: {
        options: {
          mode: "tgz",
          archive: 'dist/chat-app.tar.gz'
        },
        files: [{
          expand: true,
          cwd: "build",
          src: ['**/*'],
          dest: ''
        }, {
          expand: true,
          cwd: "node_modules",
          src: ['easyrtc/**/*', 'express/**/*', 'socket.io/**/*'],
          dest: 'node_modules/'
        }]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-haven');

  grunt.registerTask('build', ['clean', 'copy', 'concat']);
  grunt.registerTask('dist', ['haven:update', 'build', 'compress']);
  grunt.registerTask('deploy', ['dist', 'haven:deploy']);

  // Default task(s).
  grunt.registerTask('default', ['dist']);

};