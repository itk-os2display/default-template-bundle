/**
 * External video slide.
 */

// Register the function, if it does not already exist.
if (!window.slideFunctions['external-video']) {
  window.slideFunctions['external-video'] = {
    /**
     * Setup the slide for rendering.
     * @param scope
     *   The slide scope.
     */
    setup: function setupExternalVideoSlide(scope) {},

    /**
     * Run the slide.
     *
     * @param slide
     *   The slide.
     * @param region
     *   The region to call when the slide has been executed.
     */
    run: function runExternalVideoSlide(slide, region) {
      region.itkLog.info("Running external video slide: " + slide.title);

      /**
       * Helper function to update source for video.
       *
       * This is due to a memory leak problem in chrome.
       *
       * @param video
       *   The video element.
       * @param reset
       *   If true src is unloaded else src is set from data-src.
       */
      var updateVideoSources = function updateVideoSources(video, reset) {
        // Due to memory leak in chrome we change the src attribute.
        var sources = video.getElementsByTagName('source');
        for (var i = 0; i < sources.length; i++) {
          if (reset) {
            // @see http://www.attuts.com/aw-snap-solution-video-tag-dispose-method/ about the pause and load.
            video.pause();
            sources[i].setAttribute('src', '');
            video.load();
          }
          else {
            sources[i].setAttribute('src', sources[i].getAttribute('data-src'));
          }
        }
      };

      /**
       * Handle video error.
       *
       * @param event
       *   If defined it's a normal error event else it's offline down.
       */
      var videoErrorHandling = function videoErrorHandling(event) {
        if (event !== undefined) {
          // Normal javascript error event.
          event.target.removeEventListener(event.type, videoErrorHandling);
          region.itkLog.error('Network connection.', event);
        }
        else {
          region.itkLog.error('Unknown video network connection error.');
        }

        // Go to the next slide.
        region.nextSlide();
      };

      // If media is empty go to the next slide.
      if (slide.media.length <= 0) {
        region.nextSlide();
      }

      region.$timeout(function () {
        // Get hold of the video element and update.
        var video = document.getElementById('videoPlayer-' + slide.uniqueId);

        // Update video.
        updateVideoSources(video, false);

        // Add error handling.
        video.removeEventListener('error', videoErrorHandling);
        video.addEventListener('error', videoErrorHandling);

        // Reset video position to prevent flicker from latest playback.
        try {
          // Load video to ensure playback after possible errors from last playback. If not called
          // the video will not play.
          video.load();
        }
        catch (error) {
          region.itkLog.info('Video content might not be loaded, so reset current time not possible');

          // Use the error handling to get next slide.
          videoErrorHandling(undefined);
        }

        // Fade timeout to ensure video don't start before it's displayed.
        region.$timeout(function () {
          // Create interval to get video duration (ready state larger than one is
          // meta-data loaded).
          var interval = region.$interval(function () {
            if (video.readyState > 0) {
              var duration = Math.round(video.duration);
              region.progressBar.start(duration);

              // Metadata/duration found stop the interval.
              region.$interval.cancel(interval);
            }
          }, 500);

          // Go to the next slide when video playback has ended.
          video.onended = function ended(event) {
            region.itkLog.info("Video playback ended.", event);
            region.$timeout(function () {
                region.scope.$apply(function () {
                  // Remove error handling.
                  video.removeEventListener('error', videoErrorHandling);

                  // Remove video src.
                  updateVideoSources(video, true);

                  // Go to the next slide.
                  region.nextSlide();
                });
              },
              1000);
          };

          // Play the video.
          video.play();
        }, region.fadeTime);
      });
    }
  };
}
