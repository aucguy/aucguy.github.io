document.addEventListener('DOMContentLoaded', function() {
  var MINUTE_TIME = 60 * 1000;
  var HOUR_TIME = MINUTE_TIME * 60;
  var DAY_TIME = 24 * HOUR_TIME;
  var INITIAL_FACTOR = 0.2;
  
  var START = Date.UTC(2020, 3, 8, 16, 4); //April 8, 2020 7:04 pm IDT
  var END = Date.UTC(2020, 3, 15, 17, 8);  //April 15, 2020, 8:08 pm IDT
  
  var video = document.getElementById('video');
  var audio = document.getElementById('audio');
  var image = document.getElementById('image');
  var text = document.getElementById('text');
  var warning = document.getElementById('warning');
  
  var originalWidth = null;
  var originalHeight = null;
  
  var started = false;
  
  text.style.visibility = 'visible';
  
  function update() {
    var now = Date.now();
    if(now < START) {
      now = START;
      audio.pause();
      text.innerText = 'Eat your chametz while it lasts!';
      warning.style.visibility = 'hidden';
    } else if(now > END) {
      now = END;
      audio.pause();
      text.innerText = 'Finally, chametz!';
      warning.style.visibility = 'hidden';
    } else {
      audio.play();
      var diff = END - now;
      var days = Math.floor(diff / DAY_TIME);
      diff = diff % DAY_TIME;
      var hours = Math.floor(diff / HOUR_TIME);
      diff = diff % HOUR_TIME;
      var minutes = Math.floor(diff / MINUTE_TIME);
      text.innerText = days + ' days, ' + hours + ' hours, ' + minutes + ' minutes remaining';
      warning.style.visibility = 'visible';
    }
    var progress = (now - START) / (END - START) * (1 - INITIAL_FACTOR) + INITIAL_FACTOR;
    image.width = progress * originalWidth;
    image.height = progress * originalHeight;
    image.style['margin-left'] = -image.width / 2 + 'px';
    image.style['margin-top'] = -image.height / 2 + 'px';
  }
  
  document.body.addEventListener('click', function() {
    if(started) {
      return;
    }
    started = true;
    
    //video.loop = true;
    //video.play();
    
    audio.loop = true;
    audio.play();
    
    originalWidth = image.width;
    originalHeight = image.height;
    
    update();
    image.style.display = 'initial';
    
    setInterval(update, 100);
  }, true);
});