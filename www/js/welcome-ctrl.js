angular.module('ttControllers')
    .controller('welcomeCtrl', ['$scope', 'hoodieStore', '$uibModal', '$location',
    function($scope, hoodieStore, $uibModal, $location) {


  $scope.vaikeustasot = {
    'easy': 'helppo',
    'medium': 'keskivaikea',
    'hard': 'vaikea'
  };

  $scope.listSessions = function() {
    hoodieStore.findAll(function(obj) {
      return ((obj.type == 'session') && (obj.id !== $scope.session_key));
    }).then(function(sessions) {
      var training_sessions = 0;
      var total_sessions = [];
      var training_days = [];
      for (var i = 0; i < sessions.length; i++) {
        if (sessions[i].mode == 'baseline') {
          total_sessions.push(sessions[i]);
        }
        var session_date = new Date(sessions[i].createdAt);
        var datestring = session_date.getDay() + '-' + session_date.getMonth() + '-' + session_date.getFullYear();
        if ((sessions[i].mode == 'training') && ('exercises' in sessions[i])) {
          if (training_days.indexOf(datestring) < 0) {
            training_days.push(datestring);
          }
          total_sessions.push(sessions[i]);
          training_sessions += 1;
        }
      }
      $scope.training_days = training_days;
      $scope.training_sessions = training_sessions;

      $scope.sessions = total_sessions;
      if (training_days.length >= 8) {
        hoodieStore.update('settings','parameters', {
          training_target_reached: true
        });
      }
    });
  }

  $scope.listSessions();

  hoodieStore.on('session:change', function(event, session) {
    $scope.listSessions();
  });

  $scope.startNewSession = function(req_mode) {
    var mode = 'training';
    if ((!$scope.settings) || $scope.settings.mode == 'baseline' ) {
      mode = 'baseline';
    }
    if (!!req_mode) {
      mode = req_mode;
    }
    hoodieStore.add('session', {
      stage: 'vas',
      preparations: 'unfinished',
      mode: mode
    }).then(function(session) {
      return hoodieStore.updateOrAdd('session-key','current', {key: session.id});
    }).then(function() {
      $location.path('/vas');
    }).catch(function(err) {
      console.log(err);
    });
  }

  $scope.finishSession = function() {
    hoodieStore.update('session-key','current', {key: ''}).then(function() {
      $scope.listSessions();
    });
  }

  $scope.startNewExercise = function () {

    var modalInstance = $uibModal.open({
      templateUrl: 'exerciseModal.html',
      scope: $scope,
      controller: ['$scope','$uibModalInstance','$state', '$location', 'hoodieStore',
                  function($scope, $uibModalInstance, $state, $location, hoodieStore) {

        $scope.exerciseDifficultySetting = 'easy';

        $scope.ok = function() {
          $uibModalInstance.close();

          hoodieStore.update('session', $scope.session_key, {
            'active_exercise': {'difficulty': $scope.exerciseDifficultySetting},
            'stage': 'warmup'
          }).then(function() {
            $location.path('/training');
          });
        }

        $scope.cancel = function() {
          $uibModalInstance.dismiss('cancel');
        }
      }]
    });

  } // $scope.startNewExercise

}]);
