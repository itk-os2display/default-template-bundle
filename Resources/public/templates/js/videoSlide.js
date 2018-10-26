/**
 * Video slide, that plays the video.
 */

// Register the function, if it does not already exist.
if (!window.slideFunctions['video']) {
    window.slideFunctions['video'] = {
        /**
         * Setup the slide for rendering.
         * @param scope
         *   The slide scope.
         */
        setup: function setupVideoSlide(scope) {
            var slide = scope.ikSlide;

            if (slide.media_type === 'video' && slide.media.length > 0 && slide.media.hasOwnProperty('0')) {
                // Set current video variable to path to video files.
                slide.currentVideo = {
                    "mp4": slide.media[0].mp4,
                    "ogg": slide.media[0].ogv,
                    "webm": slide.media[0].webm
                };
            }
        },

        /**
         * Run the slide.
         *
         * @param slide
         *   The slide.
         * @param region
         *   The region to call when the slide has been executed.
         */
        run: function runVideoSlide(slide, region) {
            region.itkLog.info("Running video slide: " + slide.title);

            var video = null;

            // If media is empty go to the next slide.
            if (slide.media.length <= 0 || !slide.media.hasOwnProperty('0') || slide.media[0].length <= 0) {
                region.itkLog.error("No video sources");
                region.$timeout(
                    function (region) {
                        region.nextSlide();
                    },
                    5000, true, region);
                return;
            }

            if (!slide.hasOwnProperty('videoErrorHandling')) {
                /**
                 * Handle video error.
                 *
                 * @param event
                 *   If defined it's a normal error event else it's offline down.
                 */
                slide.videoErrorHandling = function videoErrorHandling(event) {
                    if (event !== undefined) {
                        region.itkLog.error('Network connection.', event);
                    }
                    else {
                        region.itkLog.error('Unknown video network connection error.');
                    }

                    if (video !== null) {
                        video.removeEventListener('error', slide.videoErrorHandling);
                    }

                    // Go to the next slide.
                    region.nextSlide();
                };
            }

            if (!slide.hasOwnProperty('updateVideoSources')) {
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
                slide.updateVideoSources = function updateVideoSources(video, reset) {
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
            }

            // Await DOM being ready.
            region.$timeout(function () {
                // Get hold of the video element and update.
                video = document.getElementById('videoPlayer-' + slide.uniqueId);

                // Update video.
                slide.updateVideoSources(video, false);

                // Add/refresh error handling.
                video.removeEventListener('error', slide.videoErrorHandling);
                video.addEventListener('error', slide.videoErrorHandling);

                // Reset video position to prevent flicker from latest playback.
                try {
                    // Load video to ensure playback after possible errors from last playback. If not called
                    // the video will not play.
                    video.load();

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
                        // Remove error handling.
                        video.removeEventListener('error', slide.videoErrorHandling);

                        // Remove video src.
                        slide.updateVideoSources(video, true);

                        if (interval !== null) {
                            region.$interval.cancel(interval);
                        }

                        // Go to the next slide.
                        region.nextSlide();
                    };

                    // Play the video.
                    video.play();
                }
                catch (error) {
                    region.itkLog.info('Video content might not be loaded, so reset current time not possible');

                    // Use the error handling to get next slide.
                    slide.videoErrorHandling(undefined);
                }
            });
        }
    };
}
