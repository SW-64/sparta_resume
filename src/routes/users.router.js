
import express from 'express'
import { prisma } from '../utils/prisma.util.js';
import bcrypt from 'bcrypt';

const router = express.Router();

//이메일 유효성 검사 함수
function emailCheck(email_address) {
    const email_regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/i;
    if (!email_regex.test(email_address)) {
        return false;
    } else {
        return true;
    }
}
//사용자생성 api
router.post('/sign-up', async (req, res, next) => {
    // 1. 이메일, 비밀번호, 비밀번호 확인, 이름을 Request Body(req.body)로 전달 받습니다
    const { email, password, passwordcheck, name } = req.body;

    // 2. 유효성 검증 및 에러 처리
    // 회원 정보 중 하나라도 빠진 경우 - “OOO을 입력해 주세요.”
    const user_info = [email, password, passwordcheck, name];

    for (let i = 0; i < user_info.length; i++) {
        let temp = user_info[i];
        if (temp == "") res.status(409).json({ message: temp + "입력해주세요" });
    }

    // 이메일 형식에 맞지 않는 경우 - “이메일 형식이 올바르지 않습니다.”
    //  ex) aaaa@naver.com 1. @가 들어있는지? 2. .com으로 끝나는지?
    if (!emailCheck(email)) {
        return res.status(409).json({ message: "이메일 형식이 올바르지 않습니다." });
    }
    // 이메일이 중복되는 경우 - “이미 가입 된 사용자입니다.”

    const isExistEmail = await prisma.user.findFirst({
        where: {
            email,
        },
    });
    if (isExistEmail) return res.status(409).json({ message: "이미 가입 된 사용자입니다." });

    // 비밀번호가 6자리 미만인 경우 - “비밀번호는 6자리 이상이어야 합니다.”
    else if (password.length < 6) return res.status(409).json({ message: "비밀번호는 6자리 이상이어야 합니다." });
    // 비밀번호와 비밀번호 확인이 일치하지 않는 경우 - “입력 한 두 비밀번호가 일치하지 않습니다.”
    else if (password != passwordcheck) return res.status(409).json({ message: "입력 한 두 비밀번호가 일치하지 않습니다." });

    // 3. 비즈니스 로직(데이터 처리)

    // 보안을 위해 비밀번호는 평문(Plain Text)으로 저장하지 않고 Hash 된 값을 저장합니다.
    const saltRounds = 10; // salt를 얼마나 복잡하게 만들지 결정합니다.
    // 'hashedPassword'는 암호화된 비밀번호 입니다.
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const user = await prisma.User.create({
        data: {
            email,
            password: hashedPassword,

        },
    });
    const userInfo = await prisma.UserInfo.create({
        data: {
            userId: user.userId, // 생성한 유저의 userId를 바탕으로 사용자 정보를 생성합니다.
            name,
        },
    });

    // 4. 반환 정보
    // 사용자 ID, 이메일, 이름, 역할, 생성일시, 수정일시를 반환합니다.

    return res.status(201).json({ data: userInfo });

});



//로그인 API
router.post('/sign-in', async (req, res, next) => {
    // 1. 요청 정보 - 이메일, 비밀번호를 Request Body(req.body)로 전달 받습니다.
    const { email, password } = req.body;
    // 2. 유효성 검증 및 에러 처리
    // 로그인 정보 중 하나라도 빠진 경우 - “OOO을 입력해 주세요.”
    /*
    if (!(email && password && passwordcheck && name)) {
        res.status(409).json({ message: "이미 가입 된 사용자입니다." });
    }
    */
    // 이메일 형식에 맞지 않는 경우 - “이메일 형식이 올바르지 않습니다.”
    if (!emailCheck(email)) {
        return res.status(409).json({ message: "이메일 형식이 올바르지 않습니다." });
    }
    // 이메일로 조회되지 않거나 비밀번호가 일치하지 않는 경우 - “인증 정보가 유효하지 않습니다.”
    const isExistEmail = await prisma.users.findFirst({
        where: {
            email,
        },
    });
    if (!isExistEmail) return res.status(409).json({ message: "조회되는 이메일이 없습니다." });
    else if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
    // 3. 비즈니스 로직(데이터 처리)
    // AccessToken(Payload에 **사용자 ID**를 포함하고, 유효기한이 **12시간)**을 생성합니다.
    const token = jwt.sign(
        {
            userId: user.userId,
            expiresIn: '12h',
        }

    );
    // 4. 반환정보
    // AccessToken을 반환합니다.
    res.cookie('authorization', `Bearer ${token}`);
    return res.status(200).json({ message: '로그인 성공' });
});



export default router;