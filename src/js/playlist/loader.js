import { PLAYLIST_LOADED, ERROR } from 'events/events';
import { localName } from 'parsers/parsers';
import parseRss from 'parsers/rssparser';
import utils from 'utils/helpers';
import Events from 'utils/backbone.events';
import { PlayerError, ERROR_LOADING_PLAYLIST } from 'api/errors';

const PlaylistLoader = function() {
    var _this = Object.assign(this, Events);

    this.load = function(playlistfile) {
        utils.ajax(playlistfile, playlistLoaded, playlistError);
    };

    this.destroy = function() {
        this.off();
    };

    function playlistLoaded(loadedEvent) {
        try {
            var childNodes = loadedEvent.responseXML ? loadedEvent.responseXML.childNodes : null;
            var rss = '';
            var jsonObj;
            if (childNodes) {
                for (var i = 0; i < childNodes.length; i++) {
                    rss = childNodes[i];
                    // 8: Node.COMMENT_NODE (IE8 doesn't have the Node.COMMENT_NODE constant)
                    if (rss.nodeType !== 8) {
                        break;
                    }
                }
                if (localName(rss) === 'xml') {
                    rss = rss.nextSibling;
                }
                if (localName(rss) === 'rss') {
                    var rssPlaylist = parseRss(rss);
                    jsonObj = Object.assign({ playlist: rssPlaylist }, rssPlaylist.feedData);
                }
            }

            // If the response is not valid RSS, check if it is JSON
            if (!jsonObj) {
                try {
                    var pl = JSON.parse(loadedEvent.responseText);
                    // If the response is not a JSON array, try to read playlist of the response
                    if (Array.isArray(pl)) {
                        jsonObj = { playlist: pl };
                    } else if (Array.isArray(pl.playlist)) {
                        jsonObj = pl;
                    } else {
                        throw Error;
                    }
                } catch (e) {
                    throw new PlayerError('Not a valid RSS/JSON feed', 21, e);
                }
            }

            _this.trigger(PLAYLIST_LOADED, jsonObj);
        } catch (error) {
            playlistError(error);
        }
    }

    function playlistError(error) {
        if (!error.code) {
            error = new PlayerError(error ? error : 'Error loading file', 0);
        }
        error.message = `Error loading playlist: ${error.message}`;
        _this.trigger(ERROR, error);
    }
};

export default PlaylistLoader;
