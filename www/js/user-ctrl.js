angular.module('ttControllers')
    .controller('UserController', ['$scope', '$rootScope', 'hoodieAccount',
    '$location', 'hoodieStore', '$window', '$uibModal',
    function($scope, $rootScope, hoodieAccount, $location, hoodieStore, $window, $uibModal) {

  $scope.account = hoodieAccount;

  $scope.accountAction = {
    logout: function() {
      //console.log('logout')
      if (!!$scope.currentsession) {
        var modalInstance = $uibModal.open({
          templateUrl: 'exitModal.html',
          scope: $scope,
          controller: ['$scope','$uibModalInstance','$state', '$location', 'hoodieStore',
                      function($scope, $uibModalInstance, $state, $location, hoodieStore) {

            $scope.exit_ok = function() {
              $uibModalInstance.close();
              hoodieStore.update('session-key','current', {key: ''}).then(function() {
                hoodieAccount.signOut().then(function() {
                  $scope.account = null;
                  $location.path('/welcome');
                }).catch(function(err) {
                  alert('Uloskirjautuminen ei onnistunut, syy: ' + err + ', ole hyvä ja lataa sivu uudestaan.');
                });
              })
            }

            $scope.exit_cancel = function() {
              $uibModalInstance.close();
              return;
            }
          }]
        });
      } else {
        return hoodieAccount.signOut().then(function() {
          $scope.account = null;
          $location.path('/welcome');
        }).catch(function(err) {
          alert('Uloskirjautuminen ei onnistunut, syy: ' + err + ', ole hyvä ja lataa sivu uudestaan.');
        });
      }
    }
  };

  $scope.onExit = function(event) {
    if (!!$scope.currentsession) {
      var dialogText = "Sinulla on käynnissä harjoituskerta. Ole hyvä ja lopeta harjoitus ennen sivulta poistumista.";
      event.returnValue = dialogText;
      return dialogText;
    }
  };

  $window.onbeforeunload =  $scope.onExit;

  //$scope.currentsession = hoodieObject.bind('session','current');


  hoodieStore.find('session-key', 'current').then(function(session_key) {
    $scope.session_key = session_key.key;
    hoodieStore.find('session', session_key.key).then(function(session) {
      $scope.currentsession = session;
    });
  });

  hoodieStore.on('session-key:current:change', function(event, session_key) {
    //console.log(event);
    if (event == 'remove') {
      delete $scope.session_key;
      console.log('deleting currentsession from scope');
      delete $scope.currentsession;
    } else {
      $scope.session_key = session_key.key;
      if (session_key.key == '') {
        delete $scope.currentsession;
        return;
      }
      hoodieStore.find('session', session_key.key).then(function(session) {
        $scope.currentsession = session;
      });
    }
  });

  hoodieStore.on('session:change', function(event, session) {
    if (session.id == $scope.session_key) {
      $scope.currentsession = session;
    }
  });

  hoodieStore.find('settings','parameters').then(function(settings) {
    $scope.settings = settings;
  });

  hoodieStore.on('settings:parameters:change', function(event, settings) {
    $scope.settings = settings;
  });

  hoodieAccount.on('signin', function() {
    $scope.account = hoodieAccount;
  });
  hoodieAccount.on('signout', function() {
    $scope.account = null;
    delete $scope.currentsession;
  });
  hoodieAccount.on('error:unauthenticated', function(err, username) {
    $scope.account = null;
    delete $scope.currentsession;
    delete $scope.session_key;
    $location.path('/login');
  })

}]);
