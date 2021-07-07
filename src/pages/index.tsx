import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import Head from "next/head";
import Header from "../components/Header";
import {FiCalendar, FiUser} from "react-icons/fi";
import {getPrismicClient} from "../services/prismic";
import Prismic from "@prismicio/client";
import {format} from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import {GetStaticProps} from "next";
import {useState} from "react";
import ApiSearchResponse from "@prismicio/client/types/ApiSearchResponse";
import Link from 'next/link';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
  preview: boolean
}

export default function Home({postsPagination, preview}: HomeProps) {
  const formattedPost = postsPagination.results.map(post => {
    return {
      ...post,
      first_publication_date: post.first_publication_date && format(
        new Date(post.first_publication_date),
        'dd MMM yyyy',
        {
          locale: ptBR
        }
      )
    }
  });
  const [posts, setPosts] = useState<Post[]>(formattedPost);
  const [nextPage, setNextPage] = useState<string>(postsPagination.next_page);


  async function handleNextPage() {
    checkIfHasNextPage()
      .then(fetchPostOfNextPage)

    async function checkIfHasNextPage() {
      if (!postsPagination.next_page) {
        throw new Error('Não existe mais posts');
      }
    }

    async function fetchPostOfNextPage() {
      const fetchedPosts = await fetch<PostPagination>(nextPage)
        .then(response => response.json());

      const formattedPosts = fetchedPosts.results.map(post => {
        post.first_publication_date = post.first_publication_date && format(
          new Date(post.first_publication_date),
          'dd MMM yyyy', {
            locale: ptBR
          });
        return post;
      })
      console.log(nextPage)
      setPosts([...posts, ...formattedPosts]);
      setNextPage(fetchedPosts.next_page);
    }
  }

  return (
    <>
      <Head>
        <title>Space Travelling</title>
      </Head>
      <div className={commonStyles.centered}>
        <Header/>
        <main className={styles.posts}>
          {posts.map(post => (
            <Link href={`/post/${post.uid}`} key={post.uid}>
              <a className={styles.post}>
                <strong>{post.data.title}</strong>
                <p>{post.data.subtitle}</p>
                <ul className={commonStyles.info}>
                  <li>
                    <FiCalendar/>
                    <time>
                      {post.first_publication_date ?
                        post.first_publication_date :
                        'Não publicado'}
                    </time>
                  </li>
                  <li>
                    <FiUser/>
                    {post.data.author}
                  </li>
                </ul>
              </a>
            </Link>
          ))}
          {nextPage && (
            <button type="button" onClick={handleNextPage}>
              Carregar mais posts
            </button>
          )}
        </main>
        {preview && (
          <aside className={commonStyles.preview}>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </div>
    </>
  );
}

function parsePosts(postsResponse: ApiSearchResponse): Post[] {
  return postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author
      }
    }
  });
}

export const getStaticProps: GetStaticProps<HomeProps> = async (
  {
    preview = false,
    previewData
  }) => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query([
      Prismic.predicates.at('document.type', 'posts'),
    ],
    {
      ref: previewData?.ref ?? null,
      pageSize: 1
    }
  );

  const posts = parsePosts(postsResponse);

  return {
    props: {
      postsPagination: {
        results: posts,
        next_page: postsResponse.next_page
      },
      preview
    },

    revalidate: 60 * 60 * 24 // 24 hours
  }
};
