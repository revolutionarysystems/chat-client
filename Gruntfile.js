module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: ["build", "dist/*"],
    concat:{
      js: {
        src: ['haven_artifacts/main/jquery/**/*.js', 'haven_artifacts/main/**/*.js'],
        dest: 'dist/client/libraries.js'
      },
      css: {
        src: ['haven_artifacts/main/**/*.css'],
        dest: 'dist/client/libraries.css'
      }
    },
    copy: {
      publish: {
        files: [{
          expand: true,
          cwd: 'client',
          src: ['**/*'],
          dest: 'dist/client/'
        },{
          expand: true,
          cwd: 'server',
          src: ['**/*'],
          dest: 'dist/'
        }]
      }
    },
    compress: {
      dist: {
        options: {
          mode: "tgz",
          archive: 'dist/chat-client.tar.gz'
        },
        files: [{
            expand: true,
            src: ['dist/**/*'],
            dest: '',
          },{
            expand: true,
            src: ['node_modules/**/*'],
            dest: '',
          }
        ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-haven');

  grunt.registerTask('build', ['clean', 'concat', 'copy']);
  grunt.registerTask('dist', ['build', 'compress']);
  grunt.registerTask('deploy', ['dist', 'haven:deploy']);

  // Default task(s).
  grunt.registerTask('default', ['build']);

};