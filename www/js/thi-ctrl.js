angular.module('ttControllers')
    .controller('thiController', ['$scope', 'hoodieAccount', '$location', 'hoodieStore', '$uibModal',
    function($scope, hoodieAccount, $location, hoodieStore, $uibModal) {

  var day = new Date();
  var daystring = '-' + day.getDate() + '-' + day.getMonth() + '-' + day.getFullYear();

  $scope.processQuestionnaire = function(info) {

    if (!$scope.thiForm.$valid) {
      return
    }

    return hoodieStore.updateOrAdd('userinfo', 'thi'+daystring, $scope.info).then(function() {
      var modalInstance = $uibModal.open({
        templateUrl: 'thiModal.html',
        scope: $scope,
        controller: ['$scope','$uibModalInstance','$state', '$location',
                    function($scope, $uibModalInstance, $state, $location) {

          $scope.ok = function() {
            $uibModalInstance.close();

            $location.path('/welcome');
          }
        }]
      });
    });

  };

  $scope.info = {};
  hoodieStore.find('userinfo','thi'+daystring).then(function(info) {
    $scope.info = info;
  });

  $scope.questionList = [
    {
      'key': 'keskittymisvaikeuksia',
      'question': 'Onko teillä keskittymisvaikeuksia tinnituksen takia?'
    },
    {
      'key': 'puheenkuuleminen',
      'question': 'Aiheuttaako tinnituksen voimakkuus teille vaikeuksia kuulla ihmisten puhetta?'
    },
    {
      'key': 'vihaiseksi',
      'question': 'Saako tinnitus teidät vihaiseksi?'
    },
    {
      'key': 'hamilleen',
      'question': 'Saako tinnitus teidät hämillenne tai ymmällenne?'
    },
    {
      'key': 'epatoivoiseksi',
      'question': 'Tunnetteko itsenne epätoivoiseksi tinnituksen takia?'
    },
    {
      'key': 'valitatteko',
      'question': 'Valitatteko paljon tinnituksenne takia?'
    },
    {
      'key': 'nukahtamisvaikeuksia',
      'question': 'Onko teillä iltaisin nukahtamisvaikeuksia tinnituksen takia?'
    },
    {
      'key': 'pakoon',
      'question': 'Tuntuuko teistä, että ette pääse tinnitukselta pakoon?'
    },
    {
      'key': 'sosiaalinenelama',
      'question': 'Häiritseekö tinnitus mahdollisuuksianne nauttia sosiaalisesta elämästä (kuten ravintolassa tai elokuvissa käynti ym.)?'
    },
    {
      'key': 'turhautumista',
      'question': 'Tunnetteko turhautumista tinnituksen takia?'
    },
    {
      'key': 'tautia',
      'question': 'Tunnetteko tinnituksen takia sairastavanne kauheaa tautia?'
    },
    {
      'key': 'nauttiaelamasta',
      'question': 'Onko teillä vaikeuksia nauttia elämästä tinnituksen takia?'
    },
    {
      'key': 'tyontekoa',
      'question': 'Häiritseekö tinnitus työntekoanne tai kotiaskareitanne?'
    },
    {
      'key': 'artynyt',
      'question': 'Oletteko usein ärtynyt tinnituksen takia?'
    },
    {
      'key': 'vaikeuksialukea',
      'question': 'Onko teidän vaikea lukea tinnituksen takia?'
    },
    {
      'key': 'poistolaltanne',
      'question': 'Saako tinnitus teidät pois tolaltanne?'
    },
    {
      'key': 'paineita',
      'question': 'Tuntuuko teistä, että tinnitusongelmanne aiheuttaa paineita tai jännitteitä suhteissa perheenjäseniinne tai ystäviinne?'
    },
    {
      'key': 'huomiotapois',
      'question': 'Tuntuuko teistä vaikealta kohdentaa huomiota pois tinnituksesta muihin asioihin?'
    },
    {
      'key': 'hallitatinnitusta',
      'question': 'Tuntuuko teistä, että teillä ei ole mitään mahdollisuutta hallita tinnitusta tai vaikuttaa siihen?'
    },
    {
      'key': 'vasyneeksi',
      'question': 'Tunnetteko itsenne usein väsyneeksi tinnituksen takia?'
    },
    {
      'key': 'masentuneeksi',
      'question': 'Tunnetteko itsenne masentuneeksi tinnituksen takia?'
    },
    {
      'key': 'ahdistuneeksi',
      'question': 'Saako tinnitus teidät tuntemaan itsenne ahdistuneeksi?'
    },
    {
      'key': 'etteparjaa',
      'question': 'Tuntuuko teistä, että ette enää pärjää tinnituksen kanssa?'
    },
    {
      'key': 'pahentaakostressi',
      'question': 'Pahentaako stressi tinnitustanne?'
    },
    {
      'key': 'epavarmaksi',
      'question': 'Saako tinnitus teidät tuntemaan olonne epävarmaksi?'
    }
  ];

}]);
