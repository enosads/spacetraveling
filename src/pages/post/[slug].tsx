import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Head from "next/head";
import Header from "../../components/Header";
import {FiCalendar, FiClock, FiUser} from "react-icons/fi";
import {getPrismicClient} from "../../services/prismic";
import Prismic from "@prismicio/client";
import {GetStaticPaths, GetStaticProps} from "next";
import {RichText} from "prismic-dom";
import {format} from "date-fns";
import ptBR from "date-fns/locale/pt-BR";
import {useRouter} from "next/router";

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({post}: PostProps) {

  post.first_publication_date = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR
    }
  );

  const wordsAmount = post.data.content.reduce((total, contentItem) => {
    total += contentItem.heading.split(' ').length

    const words = contentItem.body.map(item => item.text.split(' ').length)
    words.map(word => (total += word))

    return total
  }, 0);
  const readTime = Math.ceil(wordsAmount / 200);

  const router = useRouter()

  if (router.isFallback) {
    return <h1>Carregando...</h1>
  }

  return (
    <>
      <Head>
        <title>{`${post.data.title} | SpaceTravelling`}</title>
      </Head>
      <div className={commonStyles.centered}>
        <Header/>
      </div>
      <main>
        <img src={post.data.banner.url} alt="imagem" className={styles.banner}/>
        <div className={commonStyles.centered}>
          <div className={styles.postHeader}>
            <h1>{post.data.title}</h1>
            <ul className={commonStyles.info}>
              <li>
                <FiCalendar/>
                {post.first_publication_date}
              </li>
              <li>
                <FiUser/>
                {post.data.author}
              </li>
              <li>
                <FiClock/>
                {readTime} min
              </li>
            </ul>
          </div>
          {post.data.content.map(content => {
            return (
              <article key={content.heading} className={styles.article}>
                <h2>{content.heading}</h2>
                <div
                  dangerouslySetInnerHTML={{__html: RichText.asHtml(content.body)}}
                />
              </article>
            )
          })}

        </div>
      </main>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts')
  ]);

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid
      }
    }
  })

  return {
    paths,
    fallback: true
  }
};

function parsePost(response) {
  return {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body]
        }
      })
    }
  }
}

export const getStaticProps: GetStaticProps = async (context) => {
  const prismic = getPrismicClient();
  const {slug} = context.params;
  const response = await prismic.getByUID('posts', String(slug), {});

  const post = parsePost(response);

  return {
    props: {post},
    revalidate: 60 * 60 * 24 // 24 hours
  }

};
