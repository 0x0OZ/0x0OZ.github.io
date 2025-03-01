---
layout: posts
title: "NCSC Training 2024 Writeups"
permalink: /writeups/ncsc-training-2024
categories: [CTF, Writeups]
tags: [ctf, writeups, web, forensics, crypto]
socialImage: "images/ncsc-training-writeups/ncsc-training-2024.jpg"

---

Here are the write-ups for the challenges from the NCSC Training 2024 CTF, which took place from July 11th to July 13th, 2024.

# Writeups 

## Web

### Robot

#### Challenge Description

A Web crawler, sometimes called a robot, is an Internet bot that systematically browses the World Wide Web and that is typically operated by search engines for the purpose of Web indexing.

#### Solution

The challenge is a simple `robots.txt` as the name says, we can see `Disallow: /always_read_robots.txt` in the `robots.txt` file. So, we can access the `always_read_robots.txt` file and get the flag.

![ncsc-training-robot](/static/images/ncsc-training-writeups/ncsc-training-2024-robot.png)

### Privilege

#### Challenge Description

Cookies are a widely used way to enable authentication in many of the applications out there.

#### Solution

The challenge is a simple cookie manipulation challenge. We can see the cookie `admin=false` in the browser. We can change the value of the cookie to `true` and get the flag.

![ncsc-training-privilege](/static/images/ncsc-training-writeups/ncsc-training-2024-privilege.png)


### InjectXec

#### Challenge description

< No Description Provided >

#### Solution

It was a simple command injection, we can escape the `figlet` command context to pass any system commands using a semi-colon `;`. The source code  looked like this when I extracted it:
```php
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Text Banner Generator</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
<div class="container">
    <h2>Text Banner Generator</h2>
    <form action="" method="get">
        <input type="text" name="text" placeholder="Enter text for figlet" required>
        <input type="submit" value="Generate">
    </form>
    <?php
    if (isset($_GET['text'])) {
        $text = $_GET['text'];

        $command = "figlet $text";

        echo "<pre>";
        system($command);
        echo "</pre>";
    }
    ?>
</div>
<footer>
    <p>Powered by PHP and figlet</p>
</footer>
</body>
</html>
```



![ncsc-training-injectxec](/static/images/ncsc-training-writeups/ncsc-training-2024-injectxec.png)



### File Hunt



#### Challenge Description

Read the `flag.txt` in `home` directory of unknown user

#### Solution

The challenge is a basic LFI, we will see some links that op and some other pages which is vulnerable to LFI, we can read the current users by accessing the `etc/passwd` file and then read the `flag.txt` file in the `home` directory of `john` user that we will find there.

![ncsc-training-filehunt](/static/images/ncsc-training-writeups/ncsc-training-2024-filehunt.png)

### Method

#### Challenge Description

HTTP defines a set of request methods to indicate the desired action to be performed for a given resource.

#### Solution

The index pages open with an empty page that only has "Nothing Here" text, nothing in interesting in the page source too. So, I tried to access the `robots.txt` file and found the `Disallow: /index.php.bak`. Inside `index.php.bak` we found the following code:
```php
<?php 
$gg = $_GET['gg'];
echo base64_encode($gg);
$str = 'flag';
if($gg == base64_encode($str))
echo 'Well done! Next!';
?>
```
We can see the input is compared to the base64 of the string `flag`, so we can encode the string `flag` to base64 and pass it as the input to the index page and we will get the following results:

![ncsc-training-method-01](/static/images/ncsc-training-writeups/ncsc-training-2024-method-01.png)

We got a new for what's inside the code to work with next

```php
$GG = $_POST["GG"];
echo $GG;
if ($GG == "flag")
    echo "flag { xxxxxxxx}";
```

We need to send a post request with the GG parameter being equal to flag text, If we try to modify the request manually (GET=>POST) and add the body it will not work because we need to include add the `Content-Type: application/x-www-form-urlencoded` header too or we can use the terminal for that.

![ncsc-training-method-02](/static/images/ncsc-training-writeups/ncsc-training-2024-method-02.png)

![ncsc-training-method-03](/static/images/ncsc-training-writeups/ncsc-training-2024-method-03.png)

### Backdoor

#### Challenge Description

< No Description Provided >

#### Solution

This challenge was more fun than any other of the basic challenges in the CTF, the website index pages have a simple heading that says ***\*Welcome Bro, What is your name?\****, and nothing else around, not in the source and the robots or anywhere. So, I tried to look for any hidden files/directories and didn't find anything, then I tried to fuzz any possible parameters in the index page, which also found nothing from the quick search.

I reread the page content and noticed the word ***\*name\**** in the text, so I tried to pass the name parameter in the URL and got a reflected text when using it.

![ncsc-training-backdoor-01](/static/images/ncsc-training-writeups/ncsc-training-2024-backdoor-01.png)

We still don't have a clue about the nature of this input, I started fuzzing using burp intruder and random payloads, I also started throwing random characters and payloads till I saw the TryHarder response 

![ncsc-training-backdoor-02](/static/images/ncsc-training-writeups/ncsc-training-2024-backdoor-02.png)

I started removing characters from the payload until I got a new response

![ncsc-training-backdoor-03](/static/images/ncsc-training-writeups/ncsc-training-2024-backdoor-03.png)

It seems that `<` and many other characters and strings are prohibited. Anyway, from this error message, we now know that we are dealing with eval function and if we try to use any PHP builtin variable it will be interpreted so I started looking for a way to figure out how to execute system commands which also found the strings system, exec, passthru, and many others are blocked.

Without running a system command yet, we can call the `phpinfo()` using `?name=";phpinfo();//`

![ncsc-training-backdoor-04](/static/images/ncsc-training-writeups/ncsc-training-2024-backdoor-04.png)

Now we can use some php tricks to call system without typing system with `";$v="syste"."m";$v("ls");//`

![ncsc-training-backdoor-05](/static/images/ncsc-training-writeups/ncsc-training-2024-backdoor-05.png)

We found the flag file`never_find_flag.txt`, we can go and read it from there- But that's not interesting at all, I want to dive more and cat it using the command injection.
If we try to read the file with `";$v="syste"."m";$v("cat never_find_flag.txt");//` we will get `The name is too long` response and if we somehow shrink the length for example using `cat *txt` we are going to get `Try Harder` because `cat` is blocked.



We need to get rid of these restrictions, after looking into PHP builtin variables I thought of using different request parameters, `$_GET` and `$_POST` are blocked, I tried `$_REQUEST` and it worked, and using this payload we kind of got unintended bling bling 🙂 `";$_REQUEST[1]($_REQUEST[2]);//&1=system&2=ls; cat never_find_flag.txt ; id`

![ncsc-training-backdoor-06](/static/images/ncsc-training-writeups/ncsc-training-2024-backdoor-06.png)

I also checked the challenge source code, and the `$_REQUEST` was unintended because `Request` was one of the blocked keywords, though the used function to check was case-sensitive which allowed me to have this unintended solution.

```php
<?php
$dangerousFunctions = array('str_rot13', 'assert', 'include', 'copy', 'rename', 'Reqest', 'GET', 'POST', 'print', 'exec', 'shell_exec', 'popen', 'system', 'touch', 'echo', 'mv', 'cp', 'sed', '``', 'passthru', 'proc_open', 'while', 'read ', '>', '<', 'nano', 'vi', 'vim', 'fopen', 'fgets', 'fgetc', 'file_get_contents', 'fwrite', 'file_put_contents', 'curl_exec', 'curl_multi_exec', 'parse_ini_file', 'sleep', 'rm', 'mkdir', '}', 'show_source', 'symlink', 'apache_child_terminate', 'apache_setenv', 'define_syslog_variables', 'escapeshellarg', 'escapeshellcmd', 'eval', 'pcntl_exec', 'posix_kill', 'posix_mkfifo', 'posix_setpgid', 'posix_setsid', 'posix_setuid', 'posix_uname', 'proc_close', 'proc_get_status', 'proc_nice', 'proc_terminate', 'putenv', 'register_shutdown_function', 'register_tick_function', 'ini_set', 'set_time_limit', 'set_include_path', 'header', 'mail', 'readfile', 'file_get_contents', 'file_put_contents', 'unlink', 'cat', 'tail', 'head', 'more', 'less', 'dd', 'od', 'xxd', 'hexdump', 'file', 'awk', 'nano', 'vim', 'iconv', 'strings', 'rev', '|');

$name = $_GET['name'];
if (strlen($name) > 36) {
    die("The name is too long.");
}

foreach ($dangerousFunctions as $func) {
    if (stripos($name, $func) !== false) {
        die("Try Harder ;)");
    }
}
?>

<!DOCTYPE html>
<html>

<head>
    <style>
        body {
            background-color: black;
            height: 100vh;
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            font-size: x-large;
        }
    </style>
</head>

<body>
    <?php

    $str = "echo \"<div style='position: fixed; top: 50; left: 50;'><p style='font-size: x-large; color: white;'>Welcome Bro, What is your name? " . $name . "</p></div>\";";

    eval ($str);
    ?>
</body>

</html>
```
So I was so lucky to get the unintended solution through `$_REQUEST` because the list had `Request` and the stripos is case-sensetive.
But it here is another funny thing, we can do the same command injection technique using `$_COOKIE` instead of `$_REQUEST` and it will work

## Digital Forensics 

### Activity

#### Challenge Description

Our DFIR team has detected potinal of SQL injection attack
Can you help us revels the attacker message ?

#### Solution

The flag is the decode characters of the SQLi payload that is in the log file given

```sh
chars=$(echo 'CHAR(78,67,83,67,123), CHAR(83,81,76,105), CHAR(95,52,95,84,104), CHAR(51,95,87,49,110), CHAR(125)' | grep -oP '\(.+?(?=\))' | tr -d '(' | tr ',' '\n')
for i in `echo $chars`; do printf '%b' "\x`printf '%x' $i`"; done
```

![ncsc-training-activity](/static/images/ncsc-training-writeups/ncsc-training-2024-activity.png)


### Traffic

#### Challenge Description

Network traffic or data traffic is the amount of data moving across a network at a given point of time.

#### Solution

The challenge is a simple PCAP analysis, we can see the flag base64 encoded in one of the HTTP requests.

![ncsc-training-traffic](/static/images/ncsc-training-writeups/ncsc-training-2024-traffic.png)

### Recover
#### Challenge Description
File carving is a great method for recovering files and fragments of files when directory entries are corrupt or missing

#### Solution

The challenge is a simple file carving challenge, we can use `foremost` to carve the flag from the given image.

![ncsc-training-recover](/static/images/ncsc-training-writeups/ncsc-training-2024-recover.png)

### Meta
#### Challenge Description
Find the `Creator of the image to get the flag 🙂

#### Solution

The challenge is a simple metadata analysis challenge, we can use `exiftool` to get the metadata of the image and get the flag.

![ncsc-training-meta](/static/images/ncsc-training-writeups/ncsc-training-2024-meta.png)

### FIX
#### Challenge Description
I believe you can repair the damage to the image.

#### Solution

This challenge has a corrupted image, if we look at the hexdump of the file we will find a pattern of number `7` being repeated every one character in the file data, we can remove the `7` characters from the file and we will get a valid image file.

![ncsc-training-fix-01](/static/images/ncsc-training-writeups/ncsc-training-2024-fix-01.png)

I asked ChatGPT to generate the following script which fixes the image by removing any byte at odd positions in the file.
```python
def process_bytes(input_file, output_file):
    with open(input_file, 'rb') as infile:
        data = infile.read()

    result = bytearray()
    for i in range(len(data)):
        if (i % 2) != 1:  # Keep bytes at even positions
            result.append(data[i])

    with open(output_file, 'wb') as outfile:
        outfile.write(result)

# Usage
input_file = 'fix.png'  # Your input file
output_file = 'fixed.png'  # The file to write the processed data
process_bytes(input_file, output_file)
```

![ncsc-training-fix-02](/static/images/ncsc-training-writeups/ncsc-training-2024-fix-02.png)

## Cryptography


### VigenVault
#### Challenge Description
Uncover the final message that reveals the secret of the VigenVault.

The cipher is XGQM{Zgqilovc_Mmnrip_dcno_sd_cckwirbma_orabcndmmx_:t}

#### Solution

The challenge is a simple Vigenere cipher, we can use an online [tool](https://www.dcode.fr/vigenere-cipher) to decrypt the message and get the flag.

![ncsc-training-vigenvault](/static/images/ncsc-training-writeups/ncsc-training-2024-vigenvault.png)

### Simple Math

#### Challenge Description
Solve this cipher by sharpening your Python coding skills. Build the right script, and unlock the secrets within.

#### Solution

We got a script that does some math operations on message to generate cipher text, interestingly the script also has the reverse of those operations (decipher) so we just need to run the file to get the flag:
```py
from Crypto.Util.number import *

flag = b""
x = bytes_to_long(flag)

cipher = ((x * 1337)*20 - 100)*500

print(cipher)


# cipher = 1848786658073065839007547107151090372652500805755396861145584876406219134322720000


ff = (((1848786658073065839007547107151090372652500805755396861145584876406219134322720000//500)+100)//20)//1337
print(long_to_bytes(ff))
```
