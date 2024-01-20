// ==UserScript==
// @name         B站成分检测器
// @version      1.14
// @author       xulaupuz,trychen
// @namespace    trychen.com
// @license      GPLv3
// @description  B站评论区自动标注成分，支持动态和关注识别，默认包括原神玩家和王者荣耀玩家
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/read/*
// @match        https://www.bilibili.com/bangumi/*
// @match        https://t.bilibili.com/*
// @icon         https://static.hdslb.com/images/favicon.ico
// @connect      bilibili.com
// @grant        GM_xmlhttpRequest
// @require      https://cdn.jsdelivr.net/npm/jquery@3.6.1/dist/jquery.min.js
// ==/UserScript==

$(function () {
    // 在这里配置要检查的成分
    const checkers = [
        {
            displayName: "原神",
            displayIcon: "https://i2.hdslb.com/bfs/face/d2a95376140fb1e5efbcbed70ef62891a3e5284f.jpg@240w_240h_1c_1s.jpg",
            keywords: ["互动抽奖 #原神", "#米哈游#", "#miHoYo#","原石"],
            followings: [401742377] // 原神官方号的 UID
        },
        {
            displayName: "崩坏3",
            displayIcon: "https://i0.hdslb.com/bfs/face/f861b2ff49d2bb996ec5fd05ba7a1eeb320dbf7b.jpg@240w_240h_1c_1s.jpg",
            keywords: ["​互动抽奖 #崩坏", "关注爱酱并转发本条动态"],
            followings: [27534330] // 崩坏3官方号的 UID
        },
        {
            displayName: "王者荣耀",
            displayIcon: "https://i2.hdslb.com/bfs/face/effbafff589a27f02148d15bca7e97031a31d772.jpg@240w_240h_1c_1s.jpg",
            keywords: ["互动抽奖 #王者荣耀","超标","巅峰赛"],
            followings: [57863910, 392836434] // “王者荣耀” & “哔哩哔哩王者荣耀赛事”
        },
        {
            displayName: "VTB",
            displayIcon: "https://i2.hdslb.com/bfs/face/d399d6f5cf7943a996ae96999ba3e6ae2a2988de.jpg@240w_240h_1c_1s.jpg",
            keywords: ["@嘉然今天吃什么"],
            followings: [
                672328094, // 嘉然今天吃什么
                1437582453, // 東雪蓮Official
                1265680561, // 永雏塔菲
            ]
        },
        {
            displayName: "Asoul",
            displayIcon: "https://i2.hdslb.com/bfs/face/43b21998da8e7e210340333f46d4e2ae7ec046eb.jpg@240w_240h_1c_1s.jpg",
            keywords: ["@A-SOUL_Official", "#A_SOUL#"],
            followings: [
                703007996, // Asoul
                547510303, // Asoul二创计画
                672342685, // 乃琳Queen
                351609538, // 珈乐Carol
                672346917, // 向晚大魔王
                672353429, // 贝拉kira
            ]
        },
        {
            displayName: "移动端音游",
            displayIcon: "https://i0.hdslb.com/bfs/face/b3dd022d03c32a91be673d195a9f60c46217c406.jpg@240w_240h_1c_1s.jpg",
            keywords: ["韵律源点", "臀","phi","你线","arc","musedash","喵斯","peropero","hasuhasu","lowiro","616","guy","鸽游","malody","4k","iidx um","iidx ultimate mobile","rzline"],
            followings: [
                414149787, // Phigros官方
                13241939, // Malody公式娘
                404145357, // 韵律源点Arcaea
                269396974, // MuseDash_喵斯快跑
                29153009, // EK鲁比
            ]
        },
        {
            displayName: "街机端音游",
            displayIcon: "https://i1.hdslb.com/bfs/face/bac9333174cdc5a2246c4d30a645c0ca59487e77.jpg@240w_240h_1c_1s_.jpg",
            keywords: ["舞萌", "iidx","maimai","beatmania","乌蒙","舞立方","神曲，我懂得欣赏","神曲 我懂得欣赏","神曲我懂得欣赏","zaquva","Ryu","dj mass","sdvx","ddr","pop'n","破盆","皆传","konami","bemani","sega","sbga","华立","胜骅"],
        },
        {
            displayName: "动物园",
            displayIcon: "https://i0.hdslb.com/bfs/face/ecf4c55dad9446deed5cf67e5906f71fbbd6c032.jpg@240w_240h_1c_1s_.jpg",
            keywords: ["哈姆", "djgun","karasu","电棍","otto","棍哥","炫狗","炫家军","奥利安费","allin","wc!冰","哈比下","山泥若","火星包","包桑","斗鱼12306"],
            followings: [
                2088874781, // DJGun
                336404166, // DJBieji
                628845081, // 电棍otto
                7761588, // _Karasu_
                299013902, // 炫神_
            ]
        }


    ]

    // 空间动态api
    const spaceApiUrl = 'https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?&host_mid='
    const followingApiUrl = 'https://api.bilibili.com/x/relation/followings?vmid='

    const checked = {}
    const checking = {}
    var printed = false

    // 监听用户ID元素出现
    waitForKeyElements(".user-name", installCheckButton);
    waitForKeyElements(".sub-user-name", installCheckButton);
    waitForKeyElements(".user .name", installCheckButton);
    waitForKeyElements("#h-name", installCheckButton);

    console.log("开启B站用户成分检查器...")

    // 添加检查按钮
    function installCheckButton(element) {
        let node = $(`<div style="display: inline;" class="composition-checkable"><div class="composition-badge-control">
  <a class="composition-name-control">${searchIcon}</a>
</div></div>`)

        node.on('click', function () {
            node.find(".composition-name-control").text("检查中...")
            checkComposition(element, node.find(".composition-name-control"))
        })

        element.after(node)
    }

    // 添加标签
    function installComposition(id, element, setting) {
        let node = $(`<div style="display: inline;"><div class="composition-badge">
  <a class="composition-name">${setting.displayName}</a>
  <img src="${setting.displayIcon}" class="composition-icon">
</div></div>`)

        element.after(node)
    }

    // 检查标签
    function checkComposition(element, loadingElement) {
        // 用户ID
        let userID = element.attr("data-user-id") || element.attr("data-usercard-mid")
        // 用户名
        let name = element.text().charAt(0) == "@" ? element.text().substring(1) : element.text()

        if (checked[userID] != undefined) {
            // 已经缓存过了
            let found = checked[userID]
            if (found.length > 0) {
                for (let setting of found) {
                    installComposition(userID, element, setting)
                }
                loadingElement.parent().remove()
            } else {
                loadingElement.text('无')
            }
        } else if (checking[userID] != undefined) {
            // 检查中
            if (checking[userID].indexOf(element) < 0)
                checking[userID].push(element)
        } else {
            checking[userID] = [element]
            console.log("正在检查用户 " + name + " 的成分...");

            new Promise(async (resolve, reject) => {
                try {
                    // 找到的匹配内容
                    let found = []

                    let spaceRequest = request({
                        data: "",
                        url: spaceApiUrl + userID,
                    })

                    let followingRequest = request({
                        data: "",
                        url: followingApiUrl + userID,
                    })

                    try {
                        let spaceContent = await spaceRequest

                        if (!printed) {
                            console.log(spaceContent)
                            printed = true
                        }

                        // 动态内容检查
                        if (spaceContent.code == 0) {
                            // 解析并拼接动态数据
                            let st = JSON.stringify(spaceContent.data.items)
    
                            for (let setting of checkers) {
                                // 检查动态内容
                                if (setting.keywords) {
                                    if (setting.keywords.find(keyword => st.includes(keyword))) {
                                        if (found.indexOf(setting) < 0)
                                            found.push(setting)
                                        continue;
                                    }
                                }
                            }
                        }
                    } catch(error) {
                        console.error(`获取 ${name} ${userID} 的动态失败`, error)
                    }

                    try {
                        let followingContent = await followingRequest
                        
                        // 可能无权限
                        let following = followingContent.code == 0 ? followingContent.data.list.map(it => it.mid) : []
                        if (following) {
                            for (let setting of checkers) {
                                // 检查关注列表
                                if (setting.followings)
                                    for (let mid of setting.followings) {
                                        if (following.indexOf(mid) >= 0) {
                                            if (found.indexOf(setting) < 0)
                                                found.push(setting)
                                            continue;
                                        }
                                    }
                            }
                        }
                    } catch(error) {
                        console.error(`获取 ${name} ${userID} 的关注列表失败`, error)
                    }

                    // 添加标签
                    if (found.length > 0) {
                        // 输出日志
                        console.log(`检测到 ${name} ${userID} 的成分为 `, found.map(it => it.displayName))

                        checked[userID] = found

                        // 给所有用到的地方添加标签
                        for (let element of checking[userID]) {
                            for (let setting of found) {
                                installComposition(userID, element, setting)
                            }
                        }
                        loadingElement.parent().remove()
                    } else {
                        loadingElement.text('无')
                    }
                    
                    checked[userID] = found
                    delete checking[userID]

                    resolve(found)
                } catch (error) {
                    console.error(`检测 ${name} ${userID} 的成分失败`, error)
                    loadingElement.text('失败')
                    delete checking[userID]
                    reject(error)
                }
            })
        }
    }

    const searchIcon = `<svg width="12" height="12" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.3451 15.2003C16.6377 15.4915 16.4752 15.772 16.1934 16.0632C16.15 16.1279 16.0958 16.1818 16.0525 16.2249C15.7707 16.473 15.4456 16.624 15.1854 16.3652L11.6848 12.8815C10.4709 13.8198 8.97529 14.3267 7.44714 14.3267C3.62134 14.3267 0.5 11.2314 0.5 7.41337C0.5 3.60616 3.6105 0.5 7.44714 0.5C11.2729 0.5 14.3943 3.59538 14.3943 7.41337C14.3943 8.98802 13.8524 10.5087 12.8661 11.7383L16.3451 15.2003ZM2.13647 7.4026C2.13647 10.3146 4.52083 12.6766 7.43624 12.6766C10.3517 12.6766 12.736 10.3146 12.736 7.4026C12.736 4.49058 10.3517 2.1286 7.43624 2.1286C4.50999 2.1286 2.13647 4.50136 2.13647 7.4026Z" fill="currentColor"></path></svg>`

    // 添加标签样式
    addGlobalStyle(`
.composition-badge {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: fit-content;
  background: #00AEEC26;
  border-radius: 10px;
  margin: -6px 0;
  margin: 0 5px;
  font-family: PingFang SC, HarmonyOS_Regular, Helvetica Neue, Microsoft YaHei, sans-serif;
}

.composition-name {
  line-height: 13px;
  font-size: 13px;
  color: #00AEEC !important;
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

.composition-badge-control {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    width: fit-content;
    background: #00000008 !important;
    border-radius: 10px;
    margin: -6px 0;
    margin: 0 5px;
    font-family: PingFang SC, HarmonyOS_Regular, Helvetica Neue, Microsoft YaHei, sans-serif;
}

.composition-name-control {
    line-height: 13px;
    font-size: 12px;
    color: #00000050 !important;
    padding: 2px 8px;
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

    function request(option) {
        return new Promise((resolve, reject) => {
            let requestFunction = GM_xmlhttpRequest ? GM_xmlhttpRequest : GM.xmlHttpRequest

            requestFunction({
                method: "get",
                headers: {
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36'
                },
                ...option,
                onload: (response) => {
                    let res = JSON.parse(response.responseText)
                    resolve(res)
                },
                onerror: (error) => {
                    reject(error);
                }
            });
        })
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
            targetNodes = $(iframeSelector).contents()
                .find(selectorTxt);

        if (targetNodes && targetNodes.length > 0) {
            btargetsFound = true;
            targetNodes.each(function () {
                var jThis = $(this);
                var alreadyFound = jThis.data('alreadyFound') || false;

                if (!alreadyFound) {
                    //--- Call the payload function.
                    var cancelFound = actionFunction(jThis);
                    if (cancelFound) btargetsFound = false;
                    else jThis.data('alreadyFound', true);
                }
            });
        } else {
            btargetsFound = false;
        }

        //--- Get the timer-control variable for this selector.
        var controlObj = waitForKeyElements.controlObj || {};
        var controlKey = selectorTxt.replace(/[^\w]/g, "_");
        var timeControl = controlObj[controlKey];

        //--- Now set or clear the timer as appropriate.
        if (btargetsFound && bWaitOnce && timeControl) {
            //--- The only condition where we need to clear the timer.
            clearInterval(timeControl);
            delete controlObj[controlKey]
        } else {
            //--- Set a timer, if needed.
            if (!timeControl) {
                timeControl = setInterval(function () {
                    waitForKeyElements(selectorTxt, actionFunction, bWaitOnce, iframeSelector);
                }, 300);
                controlObj[controlKey] = timeControl;
            }
        }
        waitForKeyElements.controlObj = controlObj;
    }
})
