//사용자 인증 미들웨어
import jwt from 'jsonwebtoken';
import { prisma } from '../routes/index.js';

const authMiddleware = async (req, res, next) => {
    try {
        //1. 요청정ㅇ보
        // AccessToken을 Request Header의 Authorization 값으로 전달받기
        const accesstoken = req.headers['cookie'];

        //2. 유효성 검증 및 에러처리
        // Authorization 또는 AccessToken이 없는 경우 - “인증 정보가 없습니다.”
        if (!accesstoken) throw new Error('토큰이 존재하지 않습니다.');

        //JWT 표준 인증 형태와 일치하지 않는 경우 - “지원하지 않는 인증 방식입니다.”
        const [tokenType, token] = accesstoken.split('%20');

        //if (tokenType !== 'Bearer') throw new Error('토큰 타입이 일치하지 않습니다.');


        //Payload에 담긴 사용자 ID와 일치하는 사용자가 없는 경우 - “인증 정보와 일치하는 사용자가 없습니다.”
        const decodedToken = jwt.verify(token, process.env.CustomSecretKey);

        const userId = decodedToken.userId;

        const user = await prisma.User.findFirst({
            where: { userId: +userId },
        });


        if (!user) {
            res.clearCookie('authorization');
            throw new Error('토큰 사용자가 존재하지 않습니다.');
        }

        // req.user에 사용자 정보를 저장합니다.

        req.user = user;


        next();
    } catch (error) {
        res.clearCookie('authorization');

        // 토큰이 만료되었거나, 조작되었을 때, 에러 메시지를 다르게 출력합니다.
        switch (error.name) {
            //AccessToken의 유효기한이 지난 경우 - “인증 정보가 만료되었습니다.”
            case 'TokenExpiredError':
                return res.status(401).json({ message: '토큰이 만료되었습니다.' }); //토큰이 만료되었을때
            //그 밖의 AccessToken 검증에 실패한 경우 - “인증 정보가 유효하지 않습니다.”
            case 'JsonWebTokenError':
                return res.status(401).json({ message: '토큰이 조작되었습니다.' }); // 토큰에 검증이 실패했을 때
            default:
                return res
                    .status(401)
                    .json({ message: error.message ?? '비정상적인 요청입니다.' });
        }
    }
}

export { authMiddleware };