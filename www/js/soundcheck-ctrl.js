angular.module('ttControllers')
    .controller('soundcheckCtrl',
    ['$scope', 'utils', 'webaudiocontext', 'hoodieStore', '$location',
    function($scope, utils, webaudiocontext, hoodieStore, $location) {

  var audioCtx = webaudiocontext;

  var audioTag = document.querySelector('#testAudio');
  audioTag.loop = true;
  audioTag.volume = 0.4;
  var audioSrc = audioCtx.createMediaElementSource(audioTag);

  var pannerNode = audioCtx.createStereoPanner();
  pannerNode.pan.value = 0.0;

  audioSrc.connect(pannerNode);
  pannerNode.connect(audioCtx.destination);
  $scope.audiostatus = audioCtx.state;

  $scope.playing = 'init';
  $scope.buttonTxt = '&#9658; Play';
  $scope.leftBtnClass = '';
  $scope.rightBtnClass = '';

  $scope.play = function() {
    //console.log(audioCtx.state);
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if ($scope.playing == 'init') {
      audioTag.play();
      $scope.buttonTxt = 'Mute';
      $scope.playing = 'playing';
    } else if ($scope.playing == 'paused') {
      //pannerNode.connect(audioCtx.destination);
      audioTag.play();
      $scope.buttonTxt = 'Mute';
      $scope.playing = 'playing';
    } else if ($scope.playing == 'playing') {
      //pannerNode.disconnect(audioCtx.destination);
      audioTag.pause();
      $scope.buttonTxt = '&#9658; Play';
      $scope.playing = 'paused';
    }
    $scope.audiostatus = audioCtx.state;
  }

  $scope.panner = function(ch) {
    if ((ch == 'left') && ($scope.leftBtnClass !== 'active')) {
      pannerNode.pan.value = -1.0;
      $scope.leftBtnClass = 'active';
      $scope.rightBtnClass = '';
    } else if ((ch == 'right') && ($scope.rightBtnClass !== 'active')) {
      pannerNode.pan.value = 1.0;
      $scope.leftBtnClass = '';
      $scope.rightBtnClass = 'active';
    } else {
      pannerNode.pan.value = 0.0;
      $scope.leftBtnClass = '';
      $scope.rightBtnClass = '';
    }
    //console.log('panner ' + ch + ' left ' + $scope.leftBtnClass + ' right ' + $scope.rightBtnClass);

  }

  $scope.$on('$destroy', function() {
    if ($scope.playing !== 'init') {
      audioTag.pause();
      //audioCtx.suspend();
    }
    try {
      pannerNode.disconnect(audioCtx.destination);
    } catch(err) {
      // let it pass.
    }
  });

  $scope.ready = function() {

    hoodieStore.update('session', $scope.session_key, {
      stage: 'matching',
      headphones: $scope.headphones
    }).then(function() {
      $location.path('/matching');
    });
  }

}]);
