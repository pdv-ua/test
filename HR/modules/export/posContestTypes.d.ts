module posContestTypes {
    export interface PosContestResult {
        vacancy_id: number;
        vacancy_hrmis_id: number;
        vacancy_status: string;
        close_date: Date;
        winners: Array<Winner>;
    }

    export interface Winner {
        id: number;
        first_name: string;
        middle_name: string;
        last_name: string;
        birth_date: Date;
        ipn: string;
        sex: string;
        marital_status: string;
        picture: string;
        languages: Array<any>;
        skills: Array<any>;
        work_experiences: Array<any>;
        project_experiences: Array<any>;
        educations: Array<any>;
        additional_educations: Array<any>;
        awards: Array<any>;
        patents: Array<any>;
        publications: Array<any>;
        other_documents: Array<any>;
        is_winner: boolean
    }
}