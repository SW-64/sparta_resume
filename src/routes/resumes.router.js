
import express from 'express'
import { prisma } from '../utils/prisma.util.js';
import bcrypt from 'bcrypt';
import { authMiddleware } from '../middlewares/require-access-token.middleware.js'

const router = express.Router();

// 이력서 생성 API

router.post('/resume', authMiddleware, async (req, res, next) => {
    //1. 요청정보
    //사용자 정보는 인증 Middleware(req.user)를 통해서 전달 받습니다.
    const { userId } = req.user;
    //제목, 자기소개를 Request Body(req.body)로 전달 받습니다.
    const { title, introduce } = req.body;
    //2. 유효성 검증 및 에러처리
    //제목, 자기소개 중 하나라도 빠진 경우 - “OO을 입력해 주세요”

    if (title == null) return res.status(409).json({ message: "제목을 입력해주세요." });
    else if (introduce == null) return res.status(409).json({ message: "자기소개를 입력해주세요." });
    //자기소개 글자 수가 150자 보다 짧은 경우 - “자기소개는 150자 이상 작성해야 합니다.”
    if (introduce.length < 150) return res.status(409).json({ message: "자기소개는 150자 이상 작성해야 합니다." });
    //3. 비즈니스 로직(데이터 처리)
    //작성자 ID는 인증 Middleware에서 전달 받은 정보를 활용합니다.
    const resume = await prisma.Resume.create({
        data: {
            userId: userId,
            title: title,
            introduce: introduce

        },
    });

    //4. 반환 정보
    //이력서 ID, 작성자 ID, 제목, 자기소개, 지원 상태, 생성일시, 수정일시를 반환합니다.
    return res.status(201).json({ data: resume });

});


//이력서 목록 조회 API
router.get('/resume', authMiddleware, async (req, res, next) => {
    //1. 요청정보
    // - 사용자 정보는 인증 Middleware(`req.user`)를 통해서 전달 받습니다.
    const { userId, resumeId } = req.user;
    //- Query Parameters(req.query)으로 정렬 조건을 받습니다.
    //- 생성일시 기준 정렬은 과거순(ASC),최신순(DESC)으로 전달 받습니다. 
    let { sortBy = 'createdAt', sort = 'desc' } = req.query;
    //값이 없는 경우 최신순(DESC)정렬을 기본으로 합니다. 
    if (sort == 'asc') sort == 'asc'
    else sort == 'desc';

    // 대소문자 구분 없이 동작해야 합니다.
    // 2. 유효성검증 및 에러처리
    //일치하는 값이 없는 경우 - 빈 배열([])을 반환합니다. (StatusCode: 200)
    // 3. 비즈니스 로직




    const user = await prisma.Resume.findMany({
        where: {
            //- 현재 로그인 한 사용자가 작성한 이력서 목록만 조회합니다
            userId: +userId,
            //- DB에서 이력서 조회 시 작성자 ID가 일치해야 합니다.
            resumeId: resumeId
        },
        //- 정렬 조건에 따라 다른 결과 값을 조회합니다.
        orderBy: {
            [sortBy]: sort,
        },
        select: {
            resumeId: true,
            //- 작성자 ID가 아닌 작성자 이름을 반환하기 위해 스키마에 정의 한 Relation을 활용해 조회합니다.
            user: { select: { name: true } },

            title: true,
            introduce: true,
            status: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    // 4. 반환정보
    //이력서 ID, 작성자 이름, 제목, 자기소개, 지원 상태, 생성일시, 수정일시의 목록을 반환합니다.
    return res.status(200).json({ user });
});

//이력서 상세 조회 API
router.get('/resume/:resumeId', authMiddleware, async (req, res, next) => {
    //1. 요청정보
    // - 사용자 정보는 인증 Middleware(`req.user`)를 통해서 전달 받습니다.

    const { userId } = req.user;
    // 이력서 ID를 Path Parameters(req.params)로 전달 받습니다.


    const { resumeId } = req.params;
    // 2. 유효성검증 및 에러처리
    // 이력서 정보가 없는 경우 - “이력서가 존재하지 않습니다.”
    const resumeInfo = await prisma.Resume.findFirst({
        where: { resumeId: +resumeId },
    });

    if (!resumeInfo) return res.status(409).json({ message: "이력서가 존재하지 않습니다." });
    // 3. 비즈니스 로직
    const user = await prisma.Resume.findFirst({
        where: {
            //- 현재 로그인 한 사용자가 작성한 이력서 목록만 조회합니다
            userId: +userId,
            //- DB에서 이력서 조회 시 작성자 ID가 일치해야 합니다.
            resumeId: +resumeId
        },
        select: {
            resumeId: true,
            //- 작성자 ID가 아닌 작성자 이름을 반환하기 위해 스키마에 정의 한 Relation을 활용해 조회합니다.
            user: { select: { name: true } },

            title: true,
            introduce: true,
            status: true,
            createdAt: true,
            updatedAt: true,
        },
    })

    //- 작성자 ID가 아닌 작성자 이름을 반환하기 위해 스키마에 정의 한 Relation을 활용해 조회합니다.
    // 4. 반환정보
    //이력서 ID, 작성자 이름, 제목, 자기소개, 지원 상태, 생성일시, 수정일시의 목록을 반환합니다.
    return res.status(200).json({ user });
});

//이력서 수정 API
router.put('/resume/:resumeId', authMiddleware, async (req, res, next) => {
    // 1. 요청 정보
    //사용자 정보는 인증 Middleware(req.user)를 통해서 전달 받습니다
    const { userId } = req.user;
    // 이력서 ID를 Path Parameters(req.params)로 전달 받습니다.
    const { resumeId } = req.params;
    // 제목, 자기소개를 Request Body(req.body)로 전달 받습니다.
    const { title, introduce } = req.body;
    // 2. 유효성 검증 및 에러처리
    // 제목, 자기소개 둘 다 없는 경우 - “수정 할 정보를 입력해 주세요.”
    if (title == null) return res.status(409).json({ message: "제목을 입력해주세요." });
    else if (introduce == null) return res.status(409).json({ message: "자기소개를 입력해주세요." });
    // 이력서 정보가 없는 경우 - “이력서가 존재하지 않습니다.”
    const resumeInfo = await prisma.Resume.findFirst({
        where: { resumeId: +resumeId },
    });
    if (!resumeInfo) return res.status(409).json({ message: "이력서가 존재하지 않습니다." });

    // 3. 비즈니스 로직
    // 현재 로그인 한 사용자가 작성한 이력서만 삭제합니다.
    // DB에서 이력서 조회 시 이력서 ID, 작성자 ID가 모두 일치해야 합니다.
    const userInfo = await prisma.Resume.findFirst({
        where: {
            userId: +userId
        }
    });
    if (!userInfo) return res.status(409).json({ message: "작성자 아이디가 일치하지 않습니다." });
    // DB에서 이력서 정보를 수정합니다.
    // 제목, 자기소개는 개별 수정이 가능합니다.
    const updateResume = await prisma.$transaction(async (prisma) => {
        // 이력서 정보 업데이트
        await prisma.resume.update({
            where: { resumeId: +resumeId },
            data: {
                title: title,
                introduce: introduce
            },
        });
    })
    // 4. 반환 정보
    // 수정 된 이력서 ID, 작성자 ID, 제목, 자기소개, 지원 상태, 생성일시, 수정일시를 반환합니다.
    return res.status(200).json({ data: updateResume });
});

//이력서 삭제 API
router.delete('/resume/:resumeId', authMiddleware, async (req, res, next) => {
    // 1. 요청 정보
    // 사용자 정보는 인증 Middleware(req.user)를 통해서 전달 받습니다.
    const { userId } = req.user;
    // 이력서 ID를 Path Parameters(req.params)로 전달 받습니다.
    const { resumeId } = req.params;
    // 2. 유효성 검증 및 에러 처리
    // 이력서 정보가 없는 경우 - “이력서가 존재하지 않습니다.”
    const resumeInfo = await prisma.Resume.findFirst({
        where: { resumeId: +resumeId },
    });
    if (!resumeInfo) return res.status(409).json({ message: "이력서가 존재하지 않습니다." });
    // 3. 비즈니스 로직
    // 현재 로그인 한 사용자가 작성한 이력서만 삭제합니다.
    // DB에서 이력서 조회 시 이력서 ID, 작성자 ID가 모두 일치해야 합니다.
    const userInfo = await prisma.Resume.findFirst({
        where: {
            userId: +userId
        }
    });
    if (!userInfo) return res.status(409).json({ message: "작성자 아이디가 일치하지 않습니다." });
    // DB에서 이력서 정보를 삭제합니다.
    const deletedResume = await prisma.resume.delete({
        where: {
            resumeId: +resumeId
        }
    });
    // 4. 반환정보
    // 삭제 된 이력서 ID를 반환합니다.
    return res.status(200).json({ data: deletedResume.resumeId })
});

export default router;