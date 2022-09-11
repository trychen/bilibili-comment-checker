// ==UserScript==
// @name         B站成分检测器
// @version      1.0
// @author       xulaupuz,trychen
// @description  B站评论区自动标注动态成分，默认包括原神玩家和王者荣耀玩家
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/read/*
// @match        https://t.bilibili.com/*
// @icon         https://static.hdslb.com/images/favicon.ico
// @connect      bilibili.com
// @grant        GM_xmlhttpRequest
// @require      https://cdn.bootcdn.net/ajax/libs/jquery/3.6.1/jquery.min.js
// ==/UserScript==

$(function () {
    // 在这里配置要检查的成分
    const checkers = [
        {
            displayName: "原神玩家",
            displayIcon: "https://i2.hdslb.com/bfs/face/d2a95376140fb1e5efbcbed70ef62891a3e5284f.jpg@240w_240h_1c_1s.jpg",
            keywords: ["互动抽奖 #原神", "米哈游", "#米哈游#", "#miHoYo#"]
        },
        {
            displayName: "王者荣耀",
            displayIcon: "https://i2.hdslb.com/bfs/face/effbafff589a27f02148d15bca7e97031a31d772.jpg@240w_240h_1c_1s.jpg",
            keywords: ["互动抽奖 #王者荣耀"]
        }
    ]

    // 空间动态api
    const spaceApiUrl = 'https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?&host_mid='

    const checked = {}
    const checking = {}
    var printed = false

    waitForKeyElements(".user-name", checkComposition);
    waitForKeyElements(".sub-user-name", checkComposition);
    waitForKeyElements(".user .name", checkComposition);

    console.log("开启B站用户成分检查器...")

    function installComposition(id, element, setting) {
        let node = $(`<div style="display: inline;"><div class="composition-badge">
  <a class="composition-name">${setting.displayName}</a>
  <img src="${setting.displayIcon}" class="composition-icon">
</div></div>`)

        element.after(node)
    }

    function checkComposition(element) {
        // 用户ID
        let userID = element.attr("data-user-id") || element.attr("data-usercard-mid")
        // 用户名
        let name = element.text().charAt(0) == "@" ? element.text().substring(1) : element.text()

        if (checked[userID]) {
            // 已经缓存过了
            for(let setting of checked[userID]) {
                installComposition(userID, element, setting)
            }
        } else if (checking[userID] != undefined) {
            // 检查中
            if (checking[userID].indexOf(element) < 0)
                checking[userID].push(element)
        } else {
            checking[userID] = [element]
            // 获取最近动态
            GM_xmlhttpRequest({
                method: "get",
                url: spaceApiUrl + userID,
                data: '',
                headers:  {
                    'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36'
                },
                onload: res => {
                    if(res.status === 200) {
                        let st = JSON.stringify(JSON.parse(res.response).data.items)

                        let found = []
                        for(let setting of checkers) {
                            if (setting.keywords.find(keyword => st.includes(keyword))) {
                                found.push(setting)
                            }
                        }

                        if (found.length > 0) {

                            if (!printed) {
                                console.log(JSON.parse(res.response).data)
                                printed = true
                            }


                            console.log(`检测到 ${name} ${userID} 的成分为 `, found.map(it => it.displayName))
                            checked[userID] = found



                            for (let element of checking[userID]) {
                                for(let setting of found) {
                                    installComposition(userID, element, setting)
                                }
                            }
                        }
                    } else {
                        console.log(`检测 ${name} ${userID} 的成分失败`, res)
                    }

                    delete checking[userID]
                },
                onerror: err => {
                    console.log(`检测 ${name} ${userID} 的成分失败`, err)

                    delete checking[userID]
                },
            });
        }
    }

    addGlobalStyle(`
.composition-badge {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: fit-content;
  background: #00AEEC26;
  border-radius: 10px;
  margin: 0 5px;

  font-family: PingFang SC, HarmonyOS_Regular, Helvetica Neue, Microsoft YaHei, sans-serif;
}

.composition-name {
  line-height: 13px;
  font-size: 13px;
  color: #00AEEC;
  padding: 2px 8px;
}

.composition-icon {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  border: 2px solid white;
  margin: -6px;
  margin-right: 5px;
}
    `)

    function addGlobalStyle(css) {
        var head, style;
        head = document.getElementsByTagName('head')[0];
        if (!head) { return; }
        style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
    }

    /*--- waitForKeyElements():  A utility function, for Greasemonkey scripts,
    that detects and handles AJAXed content.

    Usage example:

        waitForKeyElements (
            "div.comments"
            , commentCallbackFunction
        );

        //--- Page-specific function to do what we want when the node is found.
        function commentCallbackFunction (jNode) {
            jNode.text ("This comment changed by waitForKeyElements().");
        }

    IMPORTANT: This function requires your script to have loaded jQuery.
    */
    function waitForKeyElements(selectorTxt, actionFunction, bWaitOnce, iframeSelector) {
        var targetNodes, btargetsFound;

        if (typeof iframeSelector == "undefined")
            targetNodes = $(selectorTxt);
        else
            targetNodes = $(iframeSelector).contents ()
                .find (selectorTxt);

        if (targetNodes && targetNodes.length > 0) {
            btargetsFound = true;
            targetNodes.each ( function () {
                var jThis  = $(this);
                var alreadyFound = jThis.data ('alreadyFound')  ||  false;

                if (!alreadyFound) {
                    //--- Call the payload function.
                    var cancelFound = actionFunction (jThis);
                    if (cancelFound) btargetsFound   = false;
                    else jThis.data ('alreadyFound', true);
                }
            } );
        } else {
            btargetsFound = false;
        }

        //--- Get the timer-control variable for this selector.
        var controlObj = waitForKeyElements.controlObj  ||  {};
        var controlKey = selectorTxt.replace (/[^\w]/g, "_");
        var timeControl = controlObj [controlKey];

        //--- Now set or clear the timer as appropriate.
        if (btargetsFound && bWaitOnce && timeControl) {
            //--- The only condition where we need to clear the timer.
            clearInterval (timeControl);
            delete controlObj [controlKey]
        } else {
            //--- Set a timer, if needed.
            if ( ! timeControl) {
                timeControl = setInterval ( function () {
                    waitForKeyElements(selectorTxt,actionFunction,bWaitOnce,iframeSelector);
                }, 300);
                controlObj [controlKey] = timeControl;
            }
        }
        waitForKeyElements.controlObj = controlObj;
    }
})
