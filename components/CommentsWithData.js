import React from 'react';
import PropTypes from 'prop-types';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import { FormattedMessage } from 'react-intl';
import { get } from 'lodash';

import { compose } from '../lib/utils';

import Error from './Error';
import Comments from './Comments';
import CommentForm from './CommentForm';
import LoginBtn from './LoginBtn';

const gqlV2 = gql; // Needed for lint validation of api v2 schema.

class CommentsWithData extends React.Component {
  static propTypes = {
    collective: PropTypes.object,
    expense: PropTypes.shape({
      id: PropTypes.number.isRequired,
      status: PropTypes.string,
      user: PropTypes.shape({
        id: PropTypes.number.isRequired,
      }),
    }),
    UpdateId: PropTypes.number,
    limit: PropTypes.number,
    LoggedInUser: PropTypes.object,
    createComment: PropTypes.func,
    data: PropTypes.object,
    view: PropTypes.object,
    fetchMore: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.createComment = this.createComment.bind(this);
  }

  async createComment(comment) {
    const { LoggedInUser, expense, collective } = this.props;

    const CommentInputType = {
      ...comment,
      CollectiveId: collective.id,
      FromCollectiveId: LoggedInUser.collective.id,
      ExpenseId: expense.id,
    };

    const res = await this.props.createComment(CommentInputType);
    return res.data.createComment;
  }

  renderUserAction(LoggedInUser, expense, notice) {
    if (!LoggedInUser)
      return (
        <div>
          <hr />
          <LoginBtn>
            <FormattedMessage id="comment.login" defaultMessage="Login to comment" />
          </LoginBtn>
        </div>
      );
    return <CommentForm onSubmit={this.createComment} LoggedInUser={LoggedInUser} notice={notice} />;
  }

  render() {
    const { data, LoggedInUser, collective, expense, view } = this.props;
    const { expense: expenseComments, error } = data;
    if (error) {
      console.error('graphql error>>>', data.error.message);
      return <Error message="GraphQL error" />;
    }

    let comments;
    let totalComments;
    if (expenseComments) {
      comments = expenseComments.comments.nodes;
      totalComments = expenseComments.comments.totalCount;
    }
    let notice;
    if (LoggedInUser && LoggedInUser.id !== get(expense, 'user.id')) {
      notice = (
        <FormattedMessage
          id="comment.post.to.author"
          defaultMessage={'Note: Your comment will be public and we will notify the person who submitted the expense'}
        />
      );
    }
    if (LoggedInUser && LoggedInUser.id === get(expense, 'user.id') && expense.status === 'APPROVED') {
      notice = (
        <FormattedMessage
          id="comment.post.to.host"
          defaultMessage={
            'Note: Your comment will be public and we will notify the administrators of the host of this collective'
          }
        />
      );
    }
    if (LoggedInUser && LoggedInUser.id === get(expense, 'user.id') && expense.status !== 'APPROVED') {
      notice = (
        <FormattedMessage
          id="comment.post.to.collective"
          defaultMessage={'Note: Your comment will be public and we will notify the administrators of this collective'}
        />
      );
    }

    return (
      <div className="CommentsWithData">
        <Comments
          collective={collective}
          comments={comments}
          totalComments={totalComments}
          editable={view !== 'compact'}
          fetchMore={this.props.fetchMore}
          LoggedInUser={LoggedInUser}
        />

        {this.renderUserAction(LoggedInUser, expense, notice)}
      </div>
    );
  }
}

const getCommentsQuery = gqlV2`
  query getCommentsQuery($id: Int!, $limit: Int, $offset: Int) {
    expense(id: $id) {
      id
      comments(limit: $limit, offset: $offset) {
        totalCount
        nodes {
          id
          html
          createdAt
          collective {
            id
            slug
            currency
            name
            ... on Collective {
              balance
              host {
                id
                slug
              }
            }
          }
          fromCollective {
            id
            type
            name
            slug
            imageUrl
          }
        }
      }
    }
  }
`;

const getCommentsQueryVariables = ({ expense, limit = COMMENTS_PER_PAGE }) => ({
  id: expense.id,
  offset: 0,
  limit,
});

const COMMENTS_PER_PAGE = 10;
export const commentsQuery = graphql(getCommentsQuery, {
  options(props) {
    return {
      context: { apiVersion: 'v2' },
      variables: getCommentsQueryVariables(props),
    };
  },
  props: ({ data }) => ({
    data,
    fetchMore: () => {
      return data.fetchMore({
        variables: {
          offset: data.expense.comments.nodes.length,
          limit: COMMENTS_PER_PAGE,
        },
        updateQuery: (previousResult, { fetchMoreResult }) => {
          if (!fetchMoreResult) {
            return previousResult;
          }
          const newResult = { ...fetchMoreResult };
          newResult.expense.comments.nodes = [
            ...previousResult.expense.comments.nodes,
            ...fetchMoreResult.expense.comments.nodes,
          ];
          return newResult;
        },
      });
    },
  }),
});

const createCommentQuery = gql`
  mutation createComment($comment: CommentInputType!) {
    createComment(comment: $comment) {
      id
      html
      createdAt
      updatedAt
      collective {
        id
        slug
        currency
        name
        host {
          id
          slug
        }
        stats {
          id
          balance
        }
      }
      fromCollective {
        id
        type
        name
        slug
        imageUrl
      }
    }
  }
`;

const addMutation = graphql(createCommentQuery, {
  props: ({ ownProps, mutate }) => ({
    createComment: async comment => {
      return await mutate({
        variables: { comment },
        update: (proxy, { data: { createComment } }) => {
          const query = getCommentsQuery;
          const variables = getCommentsQueryVariables(ownProps);
          const data = proxy.readQuery({ query, variables });
          // Increment the total amount of comments by one
          data.expense.comments.totalCount++;
          data.expense.comments.nodes.push({
            ...createComment,
            /**
             * TODO: Remove this code after migration from v1 to v2 is over.
             * In api v2 the balance is part of the collective type but in v1 is part of the stats type.
             * This code copies the balance from the stats to the collective.
             */
            collective: { ...createComment.collective, balance: createComment.collective.stats.balance },
          });
          proxy.writeQuery({ query, variables, data });
        },
      });
    },
  }),
});

const addData = compose(commentsQuery, addMutation);

export default addData(CommentsWithData);
