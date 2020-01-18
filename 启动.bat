@echo off 



set phone=


set /p phone=请输入登录手机号:


echo 您输入的手机号是：%phone%



set pwd=
set /p pwd=请输入登录密码:

echo ######################################
echo "     按回车继续，退出请关闭   
echo ######################################

pause


node src/start.js %phone% %pwd%