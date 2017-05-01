angular.module('ttControllers')
    .controller('trainingCtrl',
    ['$scope', '$window', 'utils', 'webaudiocontext', 'hoodieStore', '$uibModal',
    function($scope, $window, utils, webaudiocontext, hoodieStore, $uibModal) {

  'use strict';

  var finishedAudio = document.querySelector('#finishedAudio');
  finishedAudio.volume = 0.02;

  var audioCtx = webaudiocontext;
  //$scope.audiostatus = audioCtx.state;
  var active_exercise = {};
  if ('active_exercise' in $scope.currentsession) {
    active_exercise = $scope.currentsession.active_exercise;
  }

  if ($scope.currentsession.mode == 'baseline') {
    if (!('f1_baseline_jnd' in $scope.currentsession)) {
      $scope.which_freq = 'f1';
    } else if (!('f2_baseline_jnd' in $scope.currentsession)) {
      $scope.which_freq = 'f2';
    }
  } else {
    $scope.which_freq = $scope.settings.training_freq;
  }

  $scope.freq = $scope.settings[$scope.which_freq];
  $scope.show_volume = false;
  if (('trainingvol_' + $scope.which_freq) in $scope.settings) {
    $scope.trainingvol = $scope.settings['trainingvol_' + $scope.which_freq];
  } else {
    $scope.show_volume = ($scope.currentsession.mode == 'baseline');
    $scope.trainingvol = 20;
  }
  $scope.gain = $scope.currentsession['th_' + $scope.which_freq] * utils.dbtoa($scope.trainingvol);
  $scope.$watch('trainingvol', function() {
    $scope.gain = $scope.currentsession['th_' + $scope.which_freq] * utils.dbtoa($scope.trainingvol);
  });

  var training_history = [];

  var fs = audioCtx.sampleRate;
  var len_s = 0.5;
  var len_pause = 0.2;
  var nSamples = fs * (2 * len_s + len_pause);
  var buffer = audioCtx.createBuffer(2, nSamples, fs);
  //var angle = Math.random() * 80.0 - 40.0;
  var ild = 0.0;
  var shift_db = 10.1;
  if ($scope.currentsession.mode == 'training') {
    var jnd = $scope.settings[$scope.which_freq + '_baseline_jnd'];
    if (active_exercise.difficulty == 'easy') {
      shift_db = jnd + 4.0;
    } else if (active_exercise.difficulty == 'medium') {
      shift_db = jnd + 0.5;
    } else if (active_exercise.difficulty == 'hard') {
      shift_db = jnd - 0.5;
      if (shift_db <= 0) {
        shift_db = 0.1;
      }
    }
  }
  var abs_shift = Math.abs(shift_db);
  var ans_hist = [null,null,null];

  $scope.counter = 0;
  $scope.correct_counter = 0;
  var turns = [];
  var turn_counter = 0;
  var turn_max = 12; // continue for 12 turns
  var th_avg_n = 6; // take last 6 turns for the average when counting the threshold
  var previous_update = 'init';
  var step = 2.0;
  $scope.progressstyle = {'width': '0%'};
  $scope.direction = 0;
  if ($scope.currentsession.stage !== 'warmup') {
    $scope.msg = 'Paina \x27Play\x27 tai välilyöntiä seuraavaa ääntä varten';
  } else {
    $scope.msg = 'Paina vasemmalle tai oikealle';
  }
  //var itd_s = 0.001;
  //var itd_samples = fs * lag_s;

  $scope.correct = undefined;
  if ($scope.currentsession.stage == 'warmup') {
    $scope.answer_disabled = false;
  } else {
    $scope.answer_disabled = true;
  }
  $scope.play_disabled = false;


  // play is invoked by either clicking the play-button or by pressing spacebar
  $scope.play = function() {
    if ($scope.currentsession.stage !== 'warmup') {
      update_location();
    } else {
      $scope.answer_disabled = true;
    }

    $scope.msg = 'Kuuntele';
    $scope.play_disabled = true;

    var stimulus = utils.white_noise(nSamples);

    /*
    // sin-cos law
    l_gain = Math.cos(((90.0 + angle)/180.0) * (Math.PI/2));
    l_gain_2 = Math.cos(((90.0 + angle + shift)/180.0) * (Math.PI/2));
    r_gain = Math.sin(((90.0 + angle)/180.0) * (Math.PI/2));
    r_gain_2 = Math.sin(((90.0 + angle + shift)/180.0) * (Math.PI/2));
    */

    // ILD
    // given in decibels.
    // Start at ILD = 0 and introduce the ILD by subtracting from left channel
    // and adding to right channel. If the shift is negative, it is added to left
    // and subtracted from right. The ILD is split in half between channels to add up
    // to the desired ILD
    var l_gain = 1.0;
    var l_gain_2 = 1.0 * utils.dbtoa(-0.5 * shift_db);
    var r_gain = 1.0;
    var r_gain_2 = 1.0 * utils.dbtoa(0.5 * shift_db);

    var l_output = buffer.getChannelData(0);
    var r_output = buffer.getChannelData(1);

    for (var i = 0; i < fs * len_s; i++) {
      l_output[i] = stimulus[i] * l_gain;
      r_output[i] = stimulus[i] * r_gain;
    }

    for (var i = fs * len_s; i < fs * (len_s + len_pause); i++) {
      l_output[i] = stimulus[i] * 0;
      r_output[i] = stimulus[i] * 0;
    }

    for (var i = fs * (len_s + len_pause); i < nSamples; i++) {
      l_output[i] = stimulus[i] * l_gain_2;
      r_output[i] = stimulus[i] * r_gain_2;
    }

    // Filter the signal
    var bqf1 = audioCtx.createBiquadFilter();
    bqf1.type = 'bandpass';
    bqf1.frequency.value = $scope.freq;
    bqf1.Q.value = 6;

    var bqf2 = audioCtx.createBiquadFilter();
    bqf2.type = 'bandpass';
    bqf2.frequency.value = $scope.freq;
    bqf2.Q.value = 6;

    var bqf3 = audioCtx.createBiquadFilter();
    bqf3.type = 'bandpass';
    bqf3.frequency.value = $scope.freq;
    bqf3.Q.value = 10;

    var gainNode = audioCtx.createGain();
    gainNode.gain.value = $scope.gain;

    var src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.onended = function() {
      $scope.$apply(function() {
        gainNode.disconnect(audioCtx.destination);
        // enable answering
        if ($scope.currentsession.stage !== 'warmup') {
          $scope.msg = 'Liikkuiko ääni vasemmalle vai oikealle?';
        } else {
          $scope.msg = "Kokeile uudestaan tai lopeta lämmittely painamalla 'Valmis'";
        }
        $scope.answer_disabled = false;
      });
    }
    src.connect(bqf1);
    bqf1.connect(bqf2);
    bqf2.connect(bqf3);
    bqf3.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    src.start();

    $scope.audiostatus = audioCtx.state;
  }


  // Before playing a sound, update the location of the sound. During warmup,
  // the direction of the shift can be determined by the subject, but during
  // training and baseline testing, it is random.

  function update_location(direction) {
    //angle = Math.random() * 10.0 - 5.0; // from -5° (left) to +5° (right)

    if (!!direction) {
      if (direction == 'right') {
        shift_db = abs_shift;
        $scope.direction = 'right';
      } else {
        shift_db = -1 * abs_shift;
        $scope.direction = 'left';
      }
    } else {
      var rnd = Math.random();
      if (rnd < 0.5) {
        shift_db = abs_shift;
        $scope.direction = 'right';
      } else {
        shift_db = -1 * abs_shift;
        $scope.direction = 'left';
      }
    }
  }


  // after playing the sound, subject gives an answer either by clicking
  // or by pressing arrow keys. Then we collect their answer and see if they
  // were correct. Finally we check whether we've reached the end of training
  // or the baseline test. If so, show a popup and direct back to front page

  $scope.check_answer = function(ans) {
    $scope.counter++;

    $scope.correct = (ans == $scope.direction);
    if ($scope.correct) {
      $scope.correct_counter += 1;
    }

    ans_hist.shift(); // discard first element
    ans_hist.push($scope.correct?'corr':'wrong'); // add new to the end

    training_history.push({
      'counter': $scope.counter,
      'correct': $scope.correct,
      'answer': ans,
      'step': step,
      'shift': shift_db,
      'direction': $scope.direction
    });

    active_exercise[$scope.currentsession.mode + '_' + $scope.which_freq + '_record'] = training_history;

    $scope.msg = '';
    if ($scope.currentsession.mode == 'training') {
      $scope.progressstyle = {'width': '' + (($scope.counter*100)/50) + '%'};
    } else if ($scope.currentsession.mode == 'baseline') {
      $scope.progressstyle = {'width': '' + ((turn_counter * 100)/turn_max) + '%'};
    }
    $scope.answer_disabled = true;
    $scope.play_disabled = false;
    $scope.direction = 0;

    // If this is the baseline test, check if we need to increase or decrease
    // the ILD. Also, keep track of the turning points for determining the JND
    if ($scope.currentsession.mode == 'baseline') {

      // in the first stage, just decrease the ILD until we get one wrong answer
      if ((previous_update == 'init') && (ans_hist[ans_hist.length - 1] == 'corr')) {
        abs_shift -= step;
      }

      if ((previous_update !== 'init') && ans_hist.every(a => a == 'corr')) {
        // we are here when all three previous answers have been correct. Now
        // we decrease the ILD (i.e. go "down"). If the previous update in
        // ILD was "up", it means that now we are turning downwards again.
        if (previous_update == 'up') {
          turn_counter++;
          turns.push(abs_shift);
        }
        // clear the answer queue, so that the subject has to get three more
        // correct before decreasing the ILD again
        ans_hist = [null,null,null];
        abs_shift -= step;
        previous_update = 'down';
      } else if (ans_hist[ans_hist.length - 1] == 'wrong') {
        // every time there is a wrong answer, go up in step size.
        // if the previous step was a decrease in ILD, consider
        // this update a turn. If the previous update wasn't "down",
        // it means that this was either the first wrong after "init", or
        // we are in the middle of an increasing trend (continue going "up").
        if (previous_update == 'down') {
          turn_counter++;
          turns.push(abs_shift);
        }
        abs_shift += step;
        previous_update = 'up';
      }

      if (abs_shift > 10.1) {
        abs_shift = 10.1;
      } else if (abs_shift <= 0.0) {
        abs_shift = 0.0;
      }

      // if the current update included a turn, update the step size for
      // the next update. The step size defined here is used immediately
      // for the next position update.
      if (turn_counter < 2) {
        step = 2.0;
      } else if ((turn_counter >= 2) && (turn_counter < 8)) {
        step = 0.4;
      } else if ((turn_counter >= 8) && (turn_counter < turn_max)) {
        step = 0.2;
      }

    }

    // check if we've reached the end of training/baseline
    if (($scope.currentsession.mode == 'training') && ($scope.counter == 50)) {
      $scope.play_disabled = true;
      $scope.answer_disabled = true;
      var exercises = [];
      if ('exercises' in $scope.currentsession) {
        angular.copy($scope.currentsession.exercises, exercises);
      }
      active_exercise['correct_counter'] = $scope.correct_counter;
      exercises.push(active_exercise);
      hoodieStore.update('session', $scope.session_key, {
        'active_exercise': {},
        'exercises': exercises
      }).then(function() {
        finishTraining();
        //$scope.openModal();
      });
    } else if (($scope.currentsession.mode == 'baseline') && (turn_counter == turn_max)) {
      $scope.play_disabled = true;
      $scope.answer_disabled = true;
      var baseline = 0.0;
      for (var i = (turn_max - th_avg_n); i < turn_max; i++) {
        baseline += turns[i];
      }
      baseline /= th_avg_n;

      var tmp = {};
      angular.copy($scope.currentsession, tmp);
      tmp[$scope.which_freq + '_baseline_jnd'] = baseline;
      active_exercise[$scope.which_freq + '_baseline_jnd'] = baseline;
      active_exercise[$scope.which_freq + '_baseline_turns'] = turns;
      var exercises = [];
      if ('exercises' in $scope.currentsession) {
        angular.copy($scope.currentsession.exercises, exercises);
      }
      exercises.push(active_exercise);
      tmp.active_exercise = {};
      tmp['exercises'] = exercises;
      hoodieStore.update('session', $scope.session_key, tmp).then(function() {
        finishTraining();
        //$scope.openModal();
      });
    }

  }


  $scope.warmup = function(direction) {
    $scope.counter++;
    update_location(direction);
  }


  angular.element($window).bind('keydown', function(e) {
    //console.log('keypress ' + e.key);
    // up: 38, down: 40 , left: 37, right: 39
    switch (e.keyCode) {
    case 32: // spacebar
      // play sound, disable keys
      if ($scope.currentsession.stage == 'warmup') {
        return;
      }
      if ($scope.play_disabled) {
        return;
      }
      $scope.play_disabled = true;
      $scope.play();
      break;
    case 37: // left
      if ($scope.answer_disabled) {
        return;
      }
      //console.log('checking left');
      if ($scope.currentsession.stage == 'warmup') {
        update_location('left');
        $scope.play();
      } else {
        $scope.check_answer('left');
      }
      break;
    case 39: // right
      if ($scope.answer_disabled) {
        return;
      }
      if ($scope.currentsession.stage == 'warmup') {
        update_location('right');
        $scope.play();
      } else {
        $scope.check_answer('right');
      }
      break;
    }
    $scope.$apply();
  });


  $scope.$on('$destroy', function() {
    angular.element($window).unbind('keydown');
  });

  $scope.finishWarmup = function() {
    active_exercise[$scope.currentsession.mode + '_' + $scope.which_freq + '_warmup'] = $scope.counter;
    hoodieStore.update('session', $scope.session_key, {
      stage: 'training',
      'active_exercise': active_exercise
    }).then(function() {
      var tmpsettings = {};
      tmpsettings['trainingvol_' + $scope.which_freq] = $scope.trainingvol;
      return hoodieStore.updateOrAdd('settings', 'parameters', tmpsettings);
    }).then(function() {
      $scope.openModal('reload', 'warmup_done');
    });
  }

  function finishTraining() {
    finishedAudio.play();

    if ($scope.currentsession.mode == 'baseline') {
      if ($scope.which_freq == 'f1') {
        hoodieStore.update('session', $scope.session_key, {
          stage: 'warmup'
        }).then(function() {
          $scope.openModal('reload', 'f1_baseline_done');
        });
      } else if ($scope.which_freq == 'f2') {
        var rnd = Math.random();
        var training_freq = '';
        if (rnd < 0.5) {
          training_freq = 'f1';
        } else {
          training_freq = 'f2';
        }

        var settings_mode = 'training'
        if ('training_freq' in $scope.settings) {
          training_freq = $scope.settings.training_freq;
          settings_mode = 'finished';
        }

        hoodieStore.update('settings', 'parameters', {
          f1_baseline_jnd: $scope.currentsession.f1_baseline_jnd,
          f2_baseline_jnd: $scope.currentsession.f2_baseline_jnd,
          'training_freq': training_freq,
          mode: settings_mode
        }).then(function() {
          return hoodieStore.update('session', $scope.session_key, {
            stage: 'finished'
          });
        }).then(function(session) {
          return hoodieStore.update('session-key','current', {key: ''});
        }).then(function() {
          $scope.openModal('done', 'f2_baseline_done');
        }).catch(function(err) {
          console.log('error: ' + err);
        });
      }
    } else if ($scope.currentsession.mode == 'training') {
      hoodieStore.update('session', $scope.session_key, {
        stage: 'finished'
//      }).then(function() {
//        if ((active_exercise.difficulty == 'hard') && (active_exercise.correct_counter >= 43)) {
//          return hoodieStore.update('settings','parameters', {
//            training_target_reached: true
//          }).then(function() {
//          return hoodieStore.update('session-key','current', {key: ''});
//          });
//        }
      }).then(function() {
        $scope.openModal('done', 'training_done');
      });
    }
  }

  $scope.openModal = function(next_stage, message) {
    var modalInstance = $uibModal.open({
      templateUrl: 'finishedModal.html',
      backdrop: 'static',
      keyboard: false,
      scope: $scope,
      controller: ['$scope','$uibModalInstance','$state', '$location', 'hoodieStore',
                  function($scope, $uibModalInstance, $state, $location, hoodieStore) {

        $scope.popup_message = message;

        $scope.ok = function() {
          $uibModalInstance.close();
          if ((next_stage == 'reload')) {
            $state.reload();
          } else if (next_stage == 'done') {
            $location.path('/welcome');
          }
        }

        $scope.cancel = function() {
          $uibModalInstance.dismiss('cancel');
        }
      }]
    });
  }

}]);
