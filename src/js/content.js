require('./libs/jquery.scrollstop.min.js');
require('expose-loader?global!./content_global.js');
var helper = require("./content_helpers.js"),
    looked = require("./content_looked.js"),
    typed = require("./content_typed.js"),
    throttle = require('throttle-debounce/throttle'),
    init = {
        addClock: function() {
            $("body").append('<div id="clock"><span id="clocksec">' + 0 + '</span></div>');
            window.global.secEl = $("#clocksec");
        },
        saveProfilePic: function() {
            var profileLink = window.global.profileInfo[0].href;
            var profilePic = window.global.profileInfo.children("img")[0].src;
            var userName = window.global.profileInfo.text();
            helper.convertImg(profilePic, function(dataUri, rawImg) {
                helper.sendToBg("profilePic", [dataUri, rawImg, profileLink, userName]);
            });
        },
        listeners: function() {
            var _window = $(window);
            window.onblur = function() {
                window.global.windowFocused = false;
                window.global.lookedFocused = false;
                looked.logic.logLooked(looked.logic.cachedObj, window.global.sec);
                helper.sendToBg("blur", []);
            };
            window.onbeforeunload = function() {
                helper.sendToBg("closeWindow", []);
                if (window.global.windowFocused == true) {
                    chrome.storage.local.set({
                        "closeWindow": {
                            "timestamp": helper.now()
                        }
                    });
                    looked.logic.logLooked(looked.logic.cachedObj, window.global.sec);
                }
            };
            window.onfocus = function() {
                window.global.windowFocused = true;
                looked.checkPhotoOverlay(200, function() {
                    looked.postsInView();
                });
                helper.sendToBg("focus", []);
            };
            $.event.special.scrollstop.latency = 800;
            _window.on("scrollstop", throttle(2000, function() {
                if (window.global.windowFocused) {
                    looked.postsInView();
                }
            }));
            var prevScrollPos = 0;
            _window.on("scroll", throttle(2000, function() {
                var curPos = _window.scrollTop(),
                    dif = Math.abs(curPos - prevScrollPos);
                if (dif > 800) {
                    // scrolling a lot = stopped looking at the current post
                    looked.logic.logLooked(looked.logic.cachedObj, window.global.sec);
                }
                prevScrollPos = curPos;
            }));
            chrome.runtime.onMessage.addListener(function(req, sen, res) {
                if (req.webRequest) {
                    looked.updateNewsFeed();
                }
            });
        }
    },
    clicked = {
        init: function() {
            $("#contentCol").click(function(e) {
                var el = $(e.target);
                // check like or external link
                if (e.target.tagName.toLowerCase() == "a") {
                    if (e.target.innerText == "Like") { // like
                        var url = $(el.parents("._3ccb")[0]).find("a._5pcq").attr("href");
                        helper.sendToBg("saveClicked", {
                            type: "like",
                            url: url,
                            timestamp: helper.now()
                        });
                        console.log("clicked " + url);
                    } else if (e.target.className.toLowerCase() == "_52c6") { // external link
                        var url = el[0].href;
                        helper.sendToBg("saveClicked", {
                            type: "external",
                            url: url,
                            timestamp: helper.now()
                        });
                        console.log("clicked " + url);
                    } else { // clicked to other location e.g user
                        looked.checkPhotoOverlay(1500);
                        looked.checkLocChanged();
                    };
                } else {
                    looked.checkPhotoOverlay(1500);
                    looked.checkLocChanged();
                }
            });
            var bluebar = $("#pagelet_bluebar");
            bluebar.click(function(e) {
                var fbSearchbar = $("#pagelet_bluebar").find("input[aria-expanded=true]");
                if (fbSearchbar.length > 0 || e.target.className.indexOf("f_click") > -1) {
                    window.global.lookedFocused = false;
                };
                looked.checkLocChanged();
            })
        }
    };

window.onload = function() {
    console.log("\n\n\n\n\nKabooom. Content script loaded.");
    looked.getMinLookedDuration();
    window.global.profileInfo = $("#pagelet_bluebar a[title='Profile']");
    if (window.global.profileInfo.length > 0) {
        // this is the beginning, bg only starts tracking
        // if profle img / logged in
        helper.sendToBg("contentLoaded", [1]); // session true
        console.log("Tracking on this page.");
        init.listeners();
        init.addClock();
        init.saveProfilePic();
        looked.init();
        clicked.init();
        typed.init();
    } else {
        helper.sendToBg("contentLoaded", [0]); // session false
        console.log("No tracking on this page.");
    };
};