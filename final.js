//v2.1


/*****************************************************************************\
********************************** V I D A ************************************
*******************************************************************************

  p5.vida 0.3.00a by Paweł Janicki, 2017-2019
    https://tetoki.eu/vida | https://paweljanicki.jp

*******************************************************************************

  VIDA by Paweł Janicki is licensed under a Creative Commons
  Attribution-ShareAlike 4.0 International License
  (http://creativecommons.org/licenses/by-sa/4.0/). Based on a work at:
  https://tetoki.eu.

*******************************************************************************

  VIDA is a simple library that adds camera (or video) based motion detection
  and blob tracking functionality to p5js.

  The library allows motion detection based on a static or progressive
  background; defining rectangular zones in the monitored image, inside which
  the occurrence of motion triggers the reaction of the program; detection of
  moving objects ("blobs") with unique index, position, mass, rectangle,
  approximated polygon.

  The main guidelines of the library are to maintain the code in a compact
  form, easy to modify, hack and rework.

  VIDA is a part of the Tetoki! project (https://tetoki.eu) and is developed
  thanks to substantial help and cooperation with the WRO Art Center
  (https://wrocenter.pl) and HAT Research Center
  (http://artandsciencestudies.com).

  Notes:

    [1] Limitations: of course, the use of the camera from within web browser
    is subject to various restrictions mainly related to security settings (in
    particular, browsers differ significantly in terms of enabling access to
    the video camera for webpages (eg p5js sketches) loaded from local media or
    from the network - in the last case it is also important if the connection
    uses the HTTPS protocol [or HTTP]). Therefore, if there are problems with
    access to the video camera from within a web browser, it is worth testing a
    different one. During developement, for on-the-fly checks, VIDA is mainly
    tested with Firefox, which by default allows you to access the video camera
    from files loaded from local media. VIDA itself does not impose any
    additional specific restrictions related to the type and parameters of the
    camera - any video camera working with p5js should work with the library.
    You can find valuable information on this topic at https://webrtc.org and
    in the documentation of the web browser you use.

    [2] Also it is worth remembering that blob detection is rather expensive
    computationally, so it's worth to stick to the lowest possible video
    resolutions if you plan to run your programs on the hardware, the
    performance you are not sure. The efficiency in processing video from a
    video camera and video files should be similar.

    [3] VIDA is using (with a few exceptions) normalized coords instead of
    pixel-based. Thus, the coordinates of the active zones, the location of
    detected moving objects (and some of their other parameters) are
    represented by floating point numbers within the range from 0.0 to 1.0. The
    use of normalized coordinates and parameters allows to manipulate the
    resolution of the image being processed (eg from a video camera) without
    having to change eg the position of active zones. analogously, data
    describing moving objects is easier to use, if their values are not related
    to any specific resolution expressed in pixels. Names of all normalized
    parameters are preceded by the prefix "norm". The upper left corner of the
    image has the coordinates [0.0, 0.0]. The bottom right corner of the image
    has the coordinates [1.0, 1.0].

                      [0.0, 0.0]
                      +------------------------------|
                      |              [0.5, 0.2]      |
                      |              +               |
                      |                              |
                      |      [0.25, 0.5]             |
                      |      +                       |
                      |                              |
                      |                   [0.7, 0.8] |
                      |                   +          |
                      |                              |
                      |------------------------------+
                                                     [1.0, 1.0]

\*****************************************************************************/

var myCapture, // camera
    myVida; // VIDA

/*
  We will use the sound in this example (so remember to add the p5.Sound
  library to your project if you want to recreate this). This array will be
  used to store oscillators.
*/
var synth = [];


/*
  Generic Variables
*/

var wfont = document.querySelector(':root');

/*
  Here we are trying to get access to the camera.
*/
function initCaptureDevice() {
    try {
        myCapture = createCapture(VIDEO);
        myCapture.size(620, 480);
        myCapture.elt.setAttribute('playsinline', '');
        myCapture.hide();
        console.log(
            '[initCaptureDevice] capture ready. Resolution: ' +
            myCapture.width + ' ' + myCapture.height
        );
    } catch (_err) {
        console.log('[initCaptureDevice] capture error: ' + _err);
    }
}

function preload() {
    //font = loadFont("/AdobeClean-Bold.otf");
}

function setup() {
    createCanvas(windowWidth, windowHeight); // we need some space...

    initCaptureDevice(); // and access to the camera

    /*
      VIDA stuff. One parameter - the current sketch - should be passed to the
      class constructor (thanks to this you can use Vida e.g. in the instance
      mode).
    */
    myVida = new Vida(this); // create the object
    /*
      Turn on the progressive background mode.
    */
    myVida.progressiveBackgroundFlag = true;
    /*
      The value of the feedback for the procedure that calculates the background
      image in progressive mode. The value should be in the range from 0.0 to 1.0
      (float). Typical values of this variable are in the range between ~0.9 and
      ~0.98.
    */
    myVida.imageFilterFeedback = 0.5;
    /*
      The value of the threshold for the procedure that calculates the threshold
      image. The value should be in the range from 0.0 to 1.0 (float).
    */
    myVida.imageFilterThreshold = 0.2;
    /*
      You may need a horizontal image flip when working with the video camera.
      If you need a different kind of mirror, here are the possibilities:
        [your vida object].MIRROR_NONE
        [your vida object].MIRROR_VERTICAL
        [your vida object].MIRROR_HORIZONTAL
        [your vida object].MIRROR_BOTH
      The default value is MIRROR_NONE.
    */
    myVida.mirror = myVida.MIRROR_HORIZONTAL;
    /*
      In order for VIDA to handle active zones (it doesn't by default), we set
      this flag.
    */
    myVida.handleActiveZonesFlag = true;
    /*
      If you want to change the default sensitivity of active zones, use this
      function. The value (floating point number in the range from 0.0 to 1.0)
      passed to the function determines the movement intensity threshold which
      must be exceeded to trigger the zone (so, higher the parameter value =
      lower the zone sensitivity).
    */
    myVida.setActiveZonesNormFillThreshold(0.7);
    /*
      Let's create several active zones. VIDA uses normalized (in the range from
      0.0 to 1.0) instead of pixel-based. Thanks to this, the position and size
      of the zones are independent of any eventual changes in the captured image
      resolution.
    */
    var padding = 0.01;
    var n = 7;
    var zoneWidth = 0.12;
    var zoneHeight = 0.7;
    var hOffset = (1.0 - (n * zoneWidth + (n - 1) * padding)) / 2.0;
    //var vOffset = 0.15;
    var vOffset = (1.0 - zoneHeight) / 2.0;
    for (var i = 0; i < n; i++) {
        /*
          addActiveZone function (which, of course, adds active zones to the VIDA
          object) requires the following parameters:
            [your vida object].addActiveZone(
              _id, // zone's identifier (integer or string)
              _normX, _normY, _normW, _normH, // normalized (!) rectangle
              _onChangeCallbackFunction // callback function (triggered on change)
            );
        */
        myVida.addActiveZone(
            i,
            hOffset + i * (zoneWidth + padding), vOffset, zoneWidth, zoneHeight,
            onActiveZoneChange
        );
        /*
          For each active zone, we will also create a separate oscillator that we
          will mute/unmute depending on the state of the zone. We use the standard
          features of the p5.Sound library here: the following code just creates an
          oscillator that generates a sinusoidal waveform and places the oscillator
          in the synth array.
        */
        //var osc = new p5.Oscillator();
        //osc.setType('sine');
        /*
          Let's assume that each subsequent oscillator will play 4 halftones higher
          than the previous one (from the musical point of view, it does not make
          much sense, but it will be enough for the purposes of this example). If
          you do not take care of the music and the calculations below seem unclear
          to you, you can ignore this part or access additional information , e.g.
          here: https://en.wikipedia.org/wiki/MIDI_tuning_standard
        */
        //osc.freq(440.0 * Math.pow(2.0, (60 + (i * 4) - 69.0) / 12.0));
        //osc.amp(0.0);
        //osc.start();
        //synth[i] = osc;
    }
    frameRate(15); // set framerate
}

function draw() {
    if (myCapture !== null && myCapture !== undefined) { // safety first

        background(0, 0, 0);
        /*
          Call VIDA update function, to which we pass the current video frame as a
          parameter. Usually this function is called in the draw loop (once per
          repetition).
        */
        myVida.update(myCapture);
        /*
          Now we can display images: source video (mirrored) and subsequent stages
          of image transformations made by VIDA.
        */
        //image(myVida.currentImage, 0, 0);
        //image(myVida.backgroundImage, 320, 0);
        //image(myVida.differenceImage, 0, 240);


        image(myVida.thresholdImage, width / 2 - 370, height / 2 - 240);


        // let's also describe the displayed images
        //noStroke(); fill(255, 255, 255);
        //text('camera', 20, 20);
        //text('vida: progressive background image', 340, 20);
        //text('vida: difference image', 20, 260);
        //text('vida: threshold image', 340, 260);
        /*
          In this example, we use the built-in VIDA function for drawing zones. We
          use the version of the function with two parameters (given in pixels)
          which are the coordinates of the upper left corner of the graphic
          representation of zones. VIDA is also equipped with a version of this
          function with four parameters (the meaning of the first and second
          parameter does not change, and the third and fourth mean width and height
          respectively). For example, to draw the zones on the entire available
          surface, use the function in this way:
            [your vida object].drawActiveZones(0, 0, width, height);
        */
        myVida.drawActiveZones(0, 0, width, height);
    } else {
        /*
          If there are problems with the capture device (it's a simple mechanism so
          not every problem with the camera will be detected, but it's better than
          nothing) we will change the background color to alarmistically red.
        */
        background(255, 0, 0);
    }
}


function onActiveZoneChange(_vidaActiveZone) {
    /*
      Having access directly to objects that store active zone data, we can read
      or modify the values of individual parameters. Here is a list of parameters
      to which we have access:
        normX, normY, normW, normH - normalized coordinates of the rectangle in
      which active zone is contained (bounding box); you can change these
      parameters if you want to move the zone or change it's size;
        isEnabledFlag - if you want to disable the processing of a given active
      zone without deleting it, this flag will definitely be useful to you; if
      it's value is "true", the zone will be tested, if the variable value is
      "false", the zone will not be tested;
        isMovementDetectedFlag - the value of this flag will be "true" if motion
      is detected within the zone; otherwise, the flag value will be "false";
        isChangedFlag - this flag will be set to "true" if the status (value of
      isMovementDetectedFlag) of the zone has changed in the current frame;
      otherwise, the flag value will be "false";
        changedTime, changedFrameCount - the moment - expressed in milliseconds
      and frames - in which the zone has recently changed it's status (value of
      isMovementDetectedFlag);
        normFillFactor - ratio of the area of the zone in which movement was
      detected to the whole surface of the zone
        normFillThreshold - ratio of the area of the zone in which movement
      was detected to the total area of the zone required to be considered that
      there was a movement detected in the zone; you can modify this parameter
      if you need to be able to set the threshold of the zone individually (as
      opposed to function
      [your vida object].setActiveZonesNormFillThreshold(normVal);
      which sets the threshold value globally for all zones);
        id - zone identifier (integer or string);
        onChange - a function that will be called when the zone changes status
      (when value of this.isMovementDetectedFlag will be changed); the object
      describing the current zone will be passed to the function as a parameter.
    */
    // print zone id and status to console...
    /*
      console.log(
        'zone: ' + _vidaActiveZone.id +
        ' status: ' + _vidaActiveZone.isMovementDetectedFlag
      );
      */
    // ... or do something else, e.g., use this information to control the sound:
    // synth[_vidaActiveZone.id].amp(0.1 * _vidaActiveZone.isMovementDetectedFlag);

    // per ruotare la scritta
    switch (_vidaActiveZone.id) {
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
            let val = _vidaActiveZone.id;
            wfont.style.setProperty('--peso', (val+1) * 100);
            break;
    }
}

function myrotate(value) {
    deg += value;
    document.getElementById("text").style.transform = "rotate(" + deg + "deg)";
}


function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
