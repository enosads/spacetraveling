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
import Link from "next/link";
import Comments from "../../components/Comments";

interface Post {
  last_publication_date: string | null;
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

interface PostLink {
  uid: string;
  title: string;
}

interface PostProps {
  post: Post;
  nextPost: PostLink;
  previousPost: PostLink;
  preview: boolean;
}

export default function Post({post, previousPost, nextPost, preview}: PostProps) {
  const isPostEdited = post.first_publication_date !== post.last_publication_date;

  post.first_publication_date = post.first_publication_date && format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR
    }
  );

  let editionDate;
  if (isPostEdited) {
    editionDate = format(
      new Date(post.last_publication_date),
      "'* editado em' dd MMM yyyy', às' H':'m",
      {
        locale: ptBR
      }
    )
  }

  const wordsAmount = post.data.content.reduce((total, section) => {
    total += section.heading.split(' ').length
    const words = section.body.map(item => item.text.split(' ').length)
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
                {post.first_publication_date ?
                  post.first_publication_date :
                  'Não publicado'}
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
            {isPostEdited && <span>{editionDate}</span>}
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

          <div className={`${styles.navigation}`}>
            {previousPost &&
            <div>
              <span>{previousPost.title}</span>
              <Link href={`/post/${previousPost.uid}`}>
                <a>Post anterior</a>
              </Link>
            </div>
            }

            {nextPost &&
            <div className={styles.next}>
              <span>{nextPost.title}</span>
              <Link href={`/post/${nextPost.uid}`}>
                <a>Próximo post</a>
              </Link>
            </div>
            }
          </div>
          <Comments/>
          {preview && (
            <aside className={commonStyles.preview}>
              <Link href="/api/exit-preview">
                <a>Sair do modo Preview</a>
              </Link>
            </aside>
          )}
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
    last_publication_date: response.last_publication_date,
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


function parsePostLink(response): PostLink | null {
  if (response) {
    return {
      uid: response.uid,
      title: response.data.title,
    }
  }
  return null;
}

export const getStaticProps = async (
  {
    params,
    preview = false,
    previewData
  }) => {
  const prismic = getPrismicClient();
  const {slug} = params;
  let postId;
  const post = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref || null,
  }).then(response => {
    postId = response.id;
    return parsePost(response);
  });

  const previousPost = await prismic.query(
    Prismic.predicates.at('document.type', 'posts'),
    {pageSize: 1, after: `${postId}`, orderings: '[document.first_publication_date]'})
    .then(response => response.results[0])
    .then(parsePostLink);

  const nextPost = await prismic.query(
    Prismic.predicates.at('document.type', 'posts'),
    {pageSize: 1, after: `${postId}`, orderings: '[document.first_publication_date desc]'})
    .then(response => response.results[0])
    .then(parsePostLink);

  return {
    props: {
      post,
      nextPost,
      previousPost,
      preview
    },
    revalidate: 60 * 60 * 24 // 24 hours
  }
};
