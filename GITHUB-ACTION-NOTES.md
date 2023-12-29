# Github Action 脚本使用说明

## Gitee与Github同步脚本
`.github\workflows\sync-gitee-to-github.yml`
1. 确保gitee和github上都已经有了需要同步Inula仓库
2. 请根据 https://github.com/Yikun/hub-mirror-action 中的使用说明修改`sync-gitee-to-github.yml`脚本中的`src, dst, dst_key, dst_token`环境变量，其中`dst_key, dst_token`需要在仓库中设置 secrets 变量。
    ```
    with:
        src: gitee/JustJQ
        dst: github/JustQJ
        dst_key: ${{ secrets.GIT_PRIVATE_KEY }}
        dst_token: ${{ secrets.GIT_TOKEN }}
    ```
3. 根据 https://github.com/Yikun/hub-mirror-action 在Github和Gitee端添加需要的环境变量


## 测试用例脚本
`.github\workflows\install-and-test.yml`
1. 根据自己的中间服务器ip, user, ssh private key在Github仓库中设置相应secrets 变量
    ```
    env:
        SERVER_SSH_PRIVATE_KEY: ${{ secrets.SERVER_PRIVATE_KEY }}
        SERVER_UER_NAME: ${{ secrets.SERVER_USER_NAME }}
        SERVER_IP_ADDRESS: ${{ secrets.SERVER_IP }}
    ```
2. 修改脚本最后四行的scp命令的目的端文件夹为https://github.com/JustQJ/Inula-mid-server 提到的`test-coverage`文件夹路径
    ```
    scp -r packages/inula/coverage $SERVER_UER_NAME@$SERVER_IP_ADDRESS:/data/inula-packages/inula/
    scp -r packages/inula-request/coverage $SERVER_UER_NAME@$SERVER_IP_ADDRESS:/data/inula-packages/inula-request/
    scp -r packages/inula/coverage $SERVER_UER_NAME@$SERVER_IP_ADDRESS:/data/inula-packages/inula-intl/
    scp -r packages/inula-request/coverage $SERVER_UER_NAME@$SERVER_IP_ADDRESS:/data/inula-packages/inula-router/
    ```
    例如将第一行改为(/data ==> path_to/test-coverage)：
    ```
    scp -r packages/inula/coverage $SERVER_UER_NAME@$SERVER_IP_ADDRESS:path_to/test-coverage/inula-packages/inula/
    ```

## SonarCloud代码检查脚本
`.github\workflows\sonarcloud-analysis.yml`
1. 将项目导入 https://sonarcloud.io/projects 中
2. 根据 https://github.com/SonarSource/sonarcloud-github-action 修改`sonarcloud-analysis.yml`脚本中的 `args` 参数和 设置`env` secrets 环境变量
    ```
        args: >
                -Dsonar.organization=justqj
                -Dsonar.projectKey=JustQJ_inula
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
    ```

## Release自动版本发布脚本
`.github\workflows\release-action.yml`
1. 需要设置一个secrets 环境变量(secrets.RELEASE_TOKEN)，这个变量是 https://github.com/settings/tokens 中自己创建的token
    ```
    env:
          GITHUB_TOKEN: ${{ secrets.RELEASE_TOKEN }} 
    ```

## Docker镜像构建脚本
`.github\workflows\push-dockerhub.yml`
1. 需要修改脚本中dockerhub地址（下面的 `newplayertp/inula` ）并创建相应的User(secrets.DOCKER_USERNAME) 和 Password(secrets.DOCKER_PASSWORD) 环境变量
    ```
    - name: Build Image
        run: |
          docker build -t newplayertp/inula -f Dockerfile .
      - name: Login to Registry
        run: docker login --username=${{ secrets.DOCKER_USERNAME }} --password ${{ secrets.DOCKER_PASSWORD }}
      - name: Push Image
        run: |
          docker push newplayertp/inula
    ```

## 仓库创建的secrets变量说明
```
DOCKER_PASSWORD：dockerhub用户的密码

DOCKER_USERNAME：dockerhub用户名

GITEE_TOKEN：Gitee的私人令牌 https://gitee.com/profile/personal_access_tokens

GIT_PRIVATE_KEY：用于访问Github仓库的生成的ssh私钥，对应的公钥在这里配置 https://github.com/settings/keys

GIT_TOKEN：Github的私人令牌 https://github.com/settings/tokens

RELEASE_TOKEN：Github的私人令牌 https://github.com/settings/tokens

SERVER_IP：中间服务器的ip https://github.com/JustQJ/Inula-mid-server

SERVER_PRIVATE_KEY：访问中间服务器的ssh私钥，确保公钥已经放在了中间服务器的`.ssh/authorized_keys`文件中 https://github.com/JustQJ/Inula-mid-server

SERVER_USER_NAME：中间服务器的用户名 https://github.com/JustQJ/Inula-mid-server

SONAR_TOKEN：SonarCloud工具需要的令牌 https://sonarcloud.io/account/security

```
