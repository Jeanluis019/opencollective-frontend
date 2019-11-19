import React from 'react';
import PropTypes from 'prop-types';
import HTMLContent from '../HTMLContent';

/**
 * A thread is meant to display comments and activities in a chronological order.
 */
const Thread = ({ items }) => {
  return items.map(item => {
    switch (item.__typename) {
      // case 'CommentType':
      //   return (
      //     <div key={`${item.__typename}-${item.id}`}>
      //       <HTMLContent content={item.html} />
      //     </div>
      //   );
      default:
        return null;
    }
  });
};

Thread.propTypes = {
  /** The list of items to display, sorted by chronoligal order */
  items: PropTypes.arrayOf(
    PropTypes.oneOfType([
      // Comment
      PropTypes.shape({
        __typename: PropTypes.oneOf(['CommentType']),
        id: PropTypes.number.isRequired,
        html: PropTypes.string,
        fromCollective: PropTypes.shape({}),
      }),
    ]),
  ),
};

export default Thread;
